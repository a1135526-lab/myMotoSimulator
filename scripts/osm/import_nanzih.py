"""
Turn OpenStreetMap data of Nanzih District (Kaohsiung) into the compact city
data the street mode loads: a routable road network (with elevated roads
raised), land use, rivers, the buildings that are mapped and named places.
Everything inside the district boundary is kept, plus a short margin.

Map data (c) OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright

Usage:
    python scripts/osm/import_nanzih.py <dir with *.osm files> [--stats]

Download the data first (see scripts/osm/README.md). Output:
    src/data/cities/nanzih/nanzih.json
"""

import glob
import json
import math
import os
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

# Area kept: the district (OSM relation 楠梓區) and a margin around it; this
# box just has to hold it. The metric frame's origin stays at the old map's
# centre, so coordinates (and the street missions' places) don't move.
DISTRICT_RELATION = 2106299
MARGIN_M = 150
LAT0, LAT1 = 22.6925, 22.7585
LON0, LON1 = 120.2520, 120.3435
ORIGIN_LAT = 22.725
ORIGIN_LON = 120.31
M_PER_DEG_LAT = 110574.0
M_PER_DEG_LON = 111320.0 * math.cos(math.radians(ORIGIN_LAT))

# Road classes kept, in the order the game indexes them.
ROAD_CLASSES = [
    "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "link",
]
LINKS = {"primary_link", "secondary_link", "tertiary_link"}
DEFAULT_LANES = {
    "primary": 4, "secondary": 4, "tertiary": 2, "unclassified": 2,
    "residential": 2, "living_street": 1, "link": 1,
}

AREA_KINDS = [
    "residential", "commercial", "industrial", "park", "school", "water", "farmland", "pitch",
    "cemetery", "military",
]
POI_KINDS = [
    "station", "mrt", "university", "school", "hospital", "park", "temple", "convenience",
    "fuel", "government", "market", "food", "landmark",
]

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "data", "cities", "nanzih",
                   "nanzih.json")


def project(lat, lon):
    x = (lon - ORIGIN_LON) * M_PER_DEG_LON
    z = -(lat - ORIGIN_LAT) * M_PER_DEG_LAT
    return round(x, 1), round(z, 1)


def inside(lat, lon, margin=0.0):
    """In the district (or within MARGIN_M of it); `margin` (degrees) widens that a little."""
    if not (LAT0 - margin <= lat <= LAT1 + margin and LON0 - margin <= lon <= LON1 + margin):
        return False
    return DISTRICT.covers(*project(lat, lon), margin * M_PER_DEG_LAT)


class Mask:
    """The district on a grid, grown by MARGIN_M: a quick point test for millions of nodes."""
    CELL = 20.0

    def __init__(self):
        self.rings, self.cells, self.x0, self.z0 = [], set(), 0.0, 0.0

    def build(self, rings):
        self.rings = rings
        xs = [x for r in rings for x, _ in r]
        zs = [z for r in rings for _, z in r]
        self.x0, self.z0 = min(xs) - MARGIN_M * 2, min(zs) - MARGIN_M * 2
        nx = int((max(xs) - self.x0 + MARGIN_M * 2) / self.CELL) + 1
        nz = int((max(zs) - self.z0 + MARGIN_M * 2) / self.CELL) + 1
        core = set()
        for j in range(nz):
            cz = self.z0 + (j + 0.5) * self.CELL
            # Crossings of this row with the rings, for an even-odd fill.
            xs_cross = []
            for r in rings:
                for i in range(len(r)):
                    (ax, az), (bx, bz) = r[i], r[(i + 1) % len(r)]
                    if (az > cz) != (bz > cz):
                        xs_cross.append(ax + (cz - az) * (bx - ax) / (bz - az))
            xs_cross.sort()
            for k in range(0, len(xs_cross) - 1, 2):
                i0 = int((xs_cross[k] - self.x0) / self.CELL)
                i1 = int((xs_cross[k + 1] - self.x0) / self.CELL)
                for i in range(i0, i1 + 1):
                    core.add((i, j))
        grow = int(MARGIN_M / self.CELL) + 1
        disc = [(di, dj) for di in range(-grow, grow + 1) for dj in range(-grow, grow + 1)
                if di * di + dj * dj <= grow * grow]
        edge = {(i, j) for i, j in core
                if any((i + di, j + dj) not in core for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
        self.cells = set(core)
        for i, j in edge:
            for di, dj in disc:
                self.cells.add((i + di, j + dj))

    def covers(self, x, z, extra_m=0.0):
        if not self.rings:
            return True
        i, j = int((x - self.x0) / self.CELL), int((z - self.z0) / self.CELL)
        if (i, j) in self.cells:
            return True
        if extra_m <= 0:
            return False
        r = int(extra_m / self.CELL) + 1
        return any((i + di, j + dj) in self.cells for di in (-r, 0, r) for dj in (-r, 0, r))


DISTRICT = Mask()


def load(tile_dir):
    nodes, ways, rels = {}, {}, {}
    for path in sorted(glob.glob(os.path.join(tile_dir, "t_*.osm"))):
        for _, el in ET.iterparse(path):
            tag = el.tag
            if tag == "node":
                tags = {t.get("k"): t.get("v") for t in el.findall("tag")}
                nodes[int(el.get("id"))] = (float(el.get("lat")), float(el.get("lon")), tags)
            elif tag == "way":
                tags = {t.get("k"): t.get("v") for t in el.findall("tag")}
                refs = [int(n.get("ref")) for n in el.findall("nd")]
                ways[int(el.get("id"))] = (refs, tags)
            elif tag == "relation":
                tags = {t.get("k"): t.get("v") for t in el.findall("tag")}
                members = [(m.get("type"), int(m.get("ref")), m.get("role"))
                           for m in el.findall("member")]
                rels[int(el.get("id"))] = (members, tags)
            if tag in ("node", "way", "relation"):
                el.clear()
    return nodes, ways, rels


def road_class(tags):
    hw = tags.get("highway")
    if hw in LINKS:
        return "link"
    if hw in ROAD_CLASSES:
        if tags.get("tunnel") in ("yes", "building_passage") or tags.get("covered") == "yes":
            return None
        if tags.get("access") in ("no", "private") or tags.get("motorcycle") == "no":
            return None
        if tags.get("area") == "yes":
            return None
        return hw
    return None


def lanes_of(tags, cls):
    try:
        return max(1, min(8, int(str(tags.get("lanes", "")).split(";")[0])))
    except ValueError:
        return DEFAULT_LANES[cls] if tags.get("oneway") != "yes" else max(1, DEFAULT_LANES[cls] // 2)


def oneway_of(tags):
    v = tags.get("oneway")
    if v in ("yes", "true", "1"):
        return 1
    if v == "-1":
        return -1
    return 0


def douglas_peucker(pts, eps):
    if len(pts) < 3:
        return pts
    (ax, az), (bx, bz) = pts[0], pts[-1]
    dx, dz = bx - ax, bz - az
    seg = math.hypot(dx, dz) or 1e-9
    best, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        px, pz = pts[i]
        d = abs(dz * (px - ax) - dx * (pz - az)) / seg
        if d > best:
            best, idx = d, i
    if best <= eps:
        return [pts[0], pts[-1]]
    return douglas_peucker(pts[: idx + 1], eps)[:-1] + douglas_peucker(pts[idx:], eps)


def build_roads(nodes, ways):
    """Split kept roads into edges between junctions; keep the biggest connected network."""
    runs = []  # (node refs, tags, cls); tags carry the way id as "_way"
    for wid, (refs, way_tags) in ways.items():
        tags = {**way_tags, "_way": wid}
        cls = road_class(tags)
        if not cls:
            continue
        run = []
        for r in refs:
            n = nodes.get(r)
            if n and inside(n[0], n[1]):
                run.append(r)
            else:
                if len(run) >= 2:
                    runs.append((run, tags, cls))
                run = []
        if len(run) >= 2:
            runs.append((run, tags, cls))

    use = defaultdict(int)
    for run, _, _ in runs:
        for i, r in enumerate(run):
            use[r] += 2 if i in (0, len(run) - 1) else 1
    junction = {r for r, c in use.items() if c >= 2}

    edges = []
    for run, tags, cls in runs:
        start = 0
        for i in range(1, len(run)):
            if run[i] in junction or i == len(run) - 1:
                piece = run[start: i + 1]
                if len(piece) >= 2 and piece[0] != piece[-1]:
                    edges.append((piece, tags, cls))
                start = i

    # Largest connected component.
    adj = defaultdict(set)
    for piece, _, _ in edges:
        adj[piece[0]].add(piece[-1])
        adj[piece[-1]].add(piece[0])
    seen, best = set(), set()
    for start in adj:
        if start in seen:
            continue
        comp, stack = set(), [start]
        while stack:
            n = stack.pop()
            if n in comp:
                continue
            comp.add(n)
            stack.extend(adj[n] - comp)
        seen |= comp
        if len(comp) > len(best):
            best = comp
    return [e for e in edges if e[0][0] in best]


# ---- Elevated roads ------------------------------------------------------
# A bridge counts as elevated (高架) only when it passes over another road or
# a railway; bridges over rivers stay at street level. Decks sit DECK_M per
# layer up, and ramps run at RAMP_GRADE down to the ground junctions.
DECK_M = 6.5
RAMP_GRADE = 0.07
OVER = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential",
        "living_street", "service", "motorway_link", "trunk_link", "primary_link",
        "secondary_link", "tertiary_link"}


def _cross(p, q, r, t):
    def orient(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return (orient(p, q, r) * orient(p, q, t) < 0) and (orient(r, t, p) * orient(r, t, q) < 0)


def deck_heights(nodes, ways):
    """Height (m) of each elevated bridge way, by way id."""
    def line(refs):
        return [project(*nodes[r][:2]) for r in refs if r in nodes]
    grid = defaultdict(list)
    for wid, (refs, tags) in ways.items():
        if not (tags.get("highway") in OVER or tags.get("railway") in ("rail", "subway",
                                                                       "light_rail")):
            continue
        if tags.get("bridge") or tags.get("tunnel"):
            continue
        pts = line(refs)
        for i in range(len(pts) - 1):
            (ax, az), (bx, bz) = pts[i], pts[i + 1]
            for gx in range(int(min(ax, bx) // 50), int(max(ax, bx) // 50) + 1):
                for gz in range(int(min(az, bz) // 50), int(max(az, bz) // 50) + 1):
                    grid[(gx, gz)].append((pts[i], pts[i + 1], set(refs)))
    decks = {}
    for wid, (refs, tags) in ways.items():
        if tags.get("bridge") not in ("yes", "viaduct") or not road_class(
                {**tags, "bridge": None}):
            continue
        try:
            layer = int(str(tags.get("layer", "1")).split(";")[0])
        except ValueError:
            layer = 1
        if layer < 1:
            continue
        pts, own = line(refs), set(refs)
        over = False
        for i in range(len(pts) - 1):
            (ax, az), (bx, bz) = pts[i], pts[i + 1]
            for gx in range(int(min(ax, bx) // 50), int(max(ax, bx) // 50) + 1):
                for gz in range(int(min(az, bz) // 50), int(max(az, bz) // 50) + 1):
                    for r, t, others in grid[(gx, gz)]:
                        if not (others & own) and _cross(pts[i], pts[i + 1], r, t):
                            over = True
        if over:
            decks[wid] = DECK_M * min(2, layer)
    return decks


def overpasses(nodes, ways):
    """Elevated things you can't ride but ride under: freeway and no-motorbike viaducts, rail
    viaducts. [height m, width m, …line]."""
    out = []
    for refs, tags in ways.values():
        bridge = tags.get("bridge") in ("yes", "viaduct")
        try:
            layer = int(str(tags.get("layer", "1")).split(";")[0])
        except ValueError:
            layer = 1
        if not bridge or layer < 1:
            continue
        hw, rail = tags.get("highway"), tags.get("railway")
        if hw in OVER and not road_class({**tags, "bridge": None}):
            lanes = lanes_of(tags, "primary") if hw.startswith(("motorway", "trunk")) else 2
            width = 3.4 * lanes + 2
        elif rail in ("rail", "light_rail", "subway"):
            width = 12 if "高速鐵路" in tags.get("name", "") else 8
        else:
            continue
        run = [r for r in refs if r in nodes and inside(nodes[r][0], nodes[r][1])]
        if len(run) < 2:
            continue
        pts = douglas_peucker([project(*nodes[r][:2]) for r in run], 1.0)
        out.append([DECK_M * min(2, layer), round(width, 1)] + [c for p in pts for c in p])
    return out


def height_profiles(out_nodes, out_edges, pts_of, deck_of):
    """Heights at every point of every edge: decks up, ramps down to the ground junctions."""
    import heapq
    n_nodes = len(out_nodes) // 2
    length = [sum(math.dist(p[i], p[i + 1]) for i in range(len(p) - 1)) for p in pts_of]
    incident = defaultdict(list)
    for ei, e in enumerate(out_edges):
        incident[e[0]].append(ei)
        incident[e[1]].append(ei)
    near_deck = set()
    for ei, e in enumerate(out_edges):
        if deck_of[ei]:
            near_deck.add(e[0])
            near_deck.add(e[1])
    # Ground: a junction or dead end with a road that isn't a deck.
    ground = {v for v in range(n_nodes) if incident[v] and (
        len(incident[v]) != 2 and any(not deck_of[ei] for ei in incident[v]))}

    def spread(sources, through):
        dist = {v: 0.0 for v in sources}
        heap = [(0.0, v) for v in sources]
        while heap:
            d, v = heapq.heappop(heap)
            if d > dist.get(v, 1e18) or (d > 0 and not through(v)):
                continue
            for ei in incident[v]:
                a, b = out_edges[ei][0], out_edges[ei][1]
                w = b if a == v else a
                nd = d + length[ei]
                if nd < dist.get(w, 1e18):
                    dist[w] = nd
                    heapq.heappush(heap, (nd, w))
        return dist

    to_ground = spread(ground, lambda v: True)
    to_deck = spread(near_deck, lambda v: v not in ground)
    top = {}
    for ei, e in enumerate(out_edges):
        if deck_of[ei]:
            for v in e[:2]:
                top[v] = max(top.get(v, 0), deck_of[ei])
    profiles = {}
    for ei, e in enumerate(out_edges):
        a, b = e[0], e[1]
        h_deck = deck_of[ei] or max(top.get(a, 0), top.get(b, 0))
        if not h_deck or (not deck_of[ei] and a not in to_deck and b not in to_deck):
            continue
        hs, s = [], 0.0
        pts = densify(pts_of[ei], 15.0)
        for i, p in enumerate(pts):
            if i:
                s += math.dist(pts[i - 1], p)
            dg = min(to_ground.get(a, 1e9) + s, to_ground.get(b, 1e9) + length[ei] - s)
            if deck_of[ei]:
                db = 0.0
            else:
                db = min(to_deck.get(a, 1e9) + s, to_deck.get(b, 1e9) + length[ei] - s)
            h = min(h_deck, RAMP_GRADE * dg, max(0.0, h_deck - RAMP_GRADE * db))
            hs.append(round(h, 1))
        if max(hs) > 0.3:
            profiles[ei] = (pts, hs)
    return profiles


def densify(pts, step):
    """Extra points so no segment is longer than `step` (a ramp needs its shape)."""
    out = [pts[0]]
    for p, q in zip(pts, pts[1:]):
        n = max(1, math.ceil(math.dist(p, q) / step))
        for k in range(1, n + 1):
            out.append((round(p[0] + (q[0] - p[0]) * k / n, 1), round(p[1] + (q[1] - p[1]) * k / n, 1)))
    return out


def ring_area(pts):
    a = 0.0
    for i in range(len(pts)):
        x0, z0 = pts[i]
        x1, z1 = pts[(i + 1) % len(pts)]
        a += x0 * z1 - x1 * z0
    return a / 2


def join_rings(member_ways, ways):
    """Join multipolygon outer ways into closed rings of node refs."""
    segs = [list(ways[w][0]) for w in member_ways if w in ways and len(ways[w][0]) >= 2]
    rings = []
    while segs:
        ring = segs.pop()
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                segs.pop(i)
                changed = True
                break
        if ring[0] == ring[-1] and len(ring) >= 4:
            rings.append(ring)
    return rings


def area_kind(tags):
    lu = tags.get("landuse")
    if tags.get("natural") == "water" or tags.get("waterway") == "riverbank" or lu in (
            "reservoir", "basin"):
        return "water"
    if tags.get("amenity") in ("school", "university", "college", "kindergarten"):
        return "school"
    if tags.get("leisure") in ("pitch", "track", "stadium", "sports_centre"):
        return "pitch"
    if tags.get("leisure") in ("park", "garden", "nature_reserve", "playground") or lu in (
            "grass", "recreation_ground", "village_green", "forest") or tags.get("natural") in (
            "wood", "scrub", "grassland"):
        return "park"
    if lu in ("residential",):
        return "residential"
    if lu in ("commercial", "retail"):
        return "commercial"
    if lu in ("industrial", "port", "railway"):
        return "industrial"
    if lu in ("farmland", "meadow", "orchard", "aquaculture", "farmyard", "greenhouse_horticulture"):
        return "farmland"
    if lu == "cemetery" or tags.get("amenity") == "grave_yard":
        return "cemetery"
    if lu == "military":
        return "military"
    return None


def poi_kind(tags):
    a = tags.get("amenity")
    if tags.get("railway") == "station" or tags.get("public_transport") == "station":
        if tags.get("station") == "subway" or tags.get("subway") == "yes" or "捷運" in tags.get(
                "name", ""):
            return "mrt"
        return "station"
    if a in ("university", "college"):
        return "university"
    if a == "school":
        return "school"
    if a == "hospital":
        return "hospital"
    if tags.get("leisure") == "park":
        return "park"
    if a == "place_of_worship":
        return "temple"
    if tags.get("shop") == "convenience":
        return "convenience"
    if a == "fuel":
        return "fuel"
    if a in ("townhall", "police", "fire_station", "post_office", "library", "courthouse"):
        return "government"
    if tags.get("shop") in ("supermarket", "mall", "department_store") or a == "marketplace":
        return "market"
    if a in ("restaurant", "fast_food", "cafe"):
        return "food"
    if tags.get("tourism") in ("attraction", "museum") or tags.get("historic"):
        return "landmark"
    return None


def main():
    tile_dir = sys.argv[1]
    stats = "--stats" in sys.argv
    nodes, ways, rels = load(tile_dir)
    print(f"loaded {len(nodes)} nodes, {len(ways)} ways, {len(rels)} relations")

    # The district boundary: what to keep, and the outline drawn on the map.
    district_members, _ = rels[DISTRICT_RELATION]
    outer = [ref for t, ref, role in district_members if t == "way" and role in ("outer", "")]
    district_rings = [[project(*nodes[r][:2]) for r in ring[:-1]]
                      for ring in join_rings(outer, ways) if all(r in nodes for r in ring)]
    DISTRICT.build(district_rings)
    main_ring = max(district_rings, key=len)
    half = len(main_ring) // 2
    boundary = douglas_peucker(main_ring[: half + 1], 4)[:-1] + douglas_peucker(
        main_ring[half:] + main_ring[:1], 4)[:-1]
    decks = deck_heights(nodes, ways)

    names, name_index = [], {}

    def name_id(n):
        if not n:
            return -1
        if n not in name_index:
            name_index[n] = len(names)
            names.append(n)
        return name_index[n]

    # Roads
    edges = build_roads(nodes, ways)
    node_ids, out_nodes = {}, []

    def node_of(ref):
        if ref not in node_ids:
            node_ids[ref] = len(out_nodes) // 2
            out_nodes.extend(project(*nodes[ref][:2]))
        return node_ids[ref]

    out_edges, pts_of, deck_of = [], [], []
    total = defaultdict(float)
    for piece, tags, cls in edges:
        pts = douglas_peucker([project(*nodes[r][:2]) for r in piece], 0.6)
        pts_of.append(pts)
        deck_of.append(decks.get(tags["_way"], 0))
        a, b = node_of(piece[0]), node_of(piece[-1])
        flat = [c for p in pts[1:-1] for c in p]
        out_edges.append([a, b, name_id(tags.get("name")), ROAD_CLASSES.index(cls),
                          lanes_of(tags, cls), oneway_of(tags)] + flat)
        total[cls] += sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    signals = sorted({node_ids[r] for r in node_ids if nodes[r][2].get("highway") == "traffic_signals"})

    # Elevated roads: the deck and its ramps get denser points and a height at each.
    elevated = []
    for ei, (pts, hs) in sorted(height_profiles(out_nodes, out_edges, pts_of, deck_of).items()):
        out_edges[ei] = out_edges[ei][:6] + [c for p in pts[1:-1] for c in p]
        elevated.append([ei] + hs)

    # Areas: closed ways and multipolygon relations.
    areas, buildings = [], []

    def ring_pts(refs):
        if not all(r in nodes for r in refs):
            return None
        if not any(inside(nodes[r][0], nodes[r][1], 0.002) for r in refs):
            return None
        # Simplify a closed ring as two open halves (a ring's chord has no length).
        raw = [project(*nodes[r][:2]) for r in refs[:-1]]
        half = len(raw) // 2
        pts = douglas_peucker(raw[: half + 1], 0.5)[:-1] + douglas_peucker(raw[half:] + raw[:1],
                                                                            0.5)[:-1]
        return pts if len(pts) >= 3 else None

    for refs, tags in ways.values():
        if len(refs) < 4 or refs[0] != refs[-1]:
            continue
        if "building" in tags and tags.get("building") != "no":
            pts = ring_pts(refs)
            if pts and abs(ring_area(pts)) > 12:
                try:
                    levels = int(float(tags.get("building:levels", "0")))
                except ValueError:
                    levels = 0
                buildings.append([levels] + [c for p in pts for c in p])
            continue
        kind = area_kind(tags)
        if kind:
            pts = ring_pts(refs)
            if pts and abs(ring_area(pts)) > 50:
                areas.append([AREA_KINDS.index(kind), name_id(tags.get("name"))] +
                             [c for p in pts for c in p])
    for members, tags in rels.values():
        if tags.get("type") != "multipolygon":
            continue
        kind = area_kind(tags)
        if not kind:
            continue
        outer = [ref for t, ref, role in members if t == "way" and role in ("outer", "")]
        for ring in join_rings(outer, ways):
            pts = ring_pts(ring)
            if pts and abs(ring_area(pts)) > 50:
                areas.append([AREA_KINDS.index(kind), name_id(tags.get("name"))] +
                             [c for p in pts for c in p])

    # Rivers and streams as lines with a width.
    waterways = []
    widths = {"river": 24, "canal": 10, "stream": 6, "drain": 4, "ditch": 3}
    for refs, tags in ways.values():
        w = widths.get(tags.get("waterway"))
        if not w or tags.get("tunnel") == "culvert":
            continue
        run = [r for r in refs if r in nodes and inside(nodes[r][0], nodes[r][1], 0.002)]
        if len(run) < 2:
            continue
        pts = douglas_peucker([project(*nodes[r][:2]) for r in run], 1.0)
        waterways.append([w, name_id(tags.get("name"))] + [c for p in pts for c in p])

    # Named places: POIs from nodes and from the centres of named areas.
    pois, seen = [], set()

    def add_poi(tags, lat, lon):
        kind = poi_kind(tags)
        name = tags.get("name")
        if not kind or not name or not inside(lat, lon):
            return
        x, z = project(lat, lon)
        key = (name, round(x / 80), round(z / 80))
        if key in seen:
            return
        seen.add(key)
        pois.append([POI_KINDS.index(kind), name_id(name), x, z])

    for lat, lon, tags in nodes.values():
        if tags:
            add_poi(tags, lat, lon)
    for refs, tags in ways.values():
        if "name" in tags and poi_kind(tags) and all(r in nodes for r in refs):
            lat = sum(nodes[r][0] for r in refs) / len(refs)
            lon = sum(nodes[r][1] for r in refs) / len(refs)
            add_poi(tags, lat, lon)
    for members, tags in rels.values():
        if "name" not in tags or not poi_kind(tags) or tags.get("type") == "route":
            continue
        refs = [r for t, w, _ in members if t == "way" and w in ways for r in ways[w][0]
                if r in nodes]
        refs += [ref for t, ref, _ in members if t == "node" and ref in nodes]
        if refs:
            add_poi(tags, sum(nodes[r][0] for r in refs) / len(refs),
                    sum(nodes[r][1] for r in refs) / len(refs))

    # Neighbourhood names: suburbs (右昌, 後勁…) as points.
    places = []
    for lat, lon, tags in nodes.values():
        if tags.get("place") in ("suburb", "quarter", "neighbourhood", "village", "hamlet") and \
                tags.get("name") and inside(lat, lon, 0.003):
            places.append([name_id(tags["name"]), *project(lat, lon)])

    # 里 (admin level 9): the boundary ring when the tiles hold all of it,
    # otherwise just the centre of what they do hold.
    villages = []
    for members, tags in rels.values():
        if tags.get("boundary") != "administrative" or tags.get("admin_level") != "9":
            continue
        name = tags.get("name")
        outer = [ref for t, ref, role in members if t == "way" and role in ("outer", "")]
        refs = [r for w in outer if w in ways for r in ways[w][0] if r in nodes]
        if not name or not refs:
            continue
        lat = sum(nodes[r][0] for r in refs) / len(refs)
        lon = sum(nodes[r][1] for r in refs) / len(refs)
        if not inside(lat, lon, 0.003):
            continue
        rings = [r for r in join_rings(outer, ways) if all(n in nodes for n in r)]
        ring = []
        if rings:
            raw = [project(*nodes[r][:2]) for r in max(rings, key=len)[:-1]]
            half = len(raw) // 2
            ring = douglas_peucker(raw[: half + 1], 3)[:-1] + douglas_peucker(raw[half:] + raw[:1],
                                                                              3)[:-1]
        villages.append([name_id(name), *project(lat, lon)] + [c for p in ring for c in p])

    xs = [x for x, _ in main_ring]
    zs = [z for _, z in main_ring]
    x0, x1 = round(min(xs) - MARGIN_M - 50), round(max(xs) + MARGIN_M + 50)
    z0, z1 = round(min(zs) - MARGIN_M - 50), round(max(zs) + MARGIN_M + 50)
    data = {
        "name": "高雄市楠梓區",
        "attribution": "地圖資料 © OpenStreetMap 貢獻者（ODbL）",
        "origin": {"lat": ORIGIN_LAT, "lon": ORIGIN_LON},
        "bounds": {"minX": x0, "minZ": z0, "maxX": x1, "maxZ": z1},
        "names": names,
        "nodes": out_nodes,
        "signals": signals,
        "edges": out_edges,
        "areas": areas,
        "waterways": waterways,
        "buildings": buildings,
        "pois": pois,
        "places": places,
        "villages": villages,
        "elevated": elevated,
        "overpasses": overpasses(nodes, ways),
        "boundary": [c for p in boundary for c in p],
    }
    print(f"bounds {x0},{z0} → {x1},{z1}")
    print(f"{len(out_nodes)//2} junctions, {len(out_edges)} road edges, {len(signals)} signals")
    print(f"{len(data['overpasses'])} overpasses (no motorbikes / rail)")
    print(f"{len(decks)} elevated bridge ways, {len(elevated)} edges with height "
          f"({sum(1 for e in elevated if max(e[1:]) >= DECK_M - 0.1)} reach deck height)")
    for e in elevated:
        if max(e[1:]) >= DECK_M - 0.1:
            nm = out_edges[e[0]][2]
            print("   deck:", names[nm] if nm >= 0 else "(unnamed)", f"{max(e[1:])} m")
    for cls in ROAD_CLASSES:
        print(f"  {cls:14s} {total[cls]/1000:7.1f} km")
    print(f"{len(areas)} areas, {len(waterways)} waterways, {len(buildings)} buildings, "
          f"{len(pois)} pois, {len(places)} places, {len(villages)} villages "
          f"({sum(1 for v in villages if len(v) > 3)} with rings)")
    by_kind = defaultdict(int)
    for p in pois:
        by_kind[POI_KINDS[p[0]]] += 1
    print("  pois:", dict(by_kind))
    by_area = defaultdict(int)
    for a in areas:
        by_area[AREA_KINDS[a[0]]] += 1
    print("  areas:", dict(by_area))
    if stats:
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT} ({os.path.getsize(OUT)//1024} KB)")


if __name__ == "__main__":
    main()
