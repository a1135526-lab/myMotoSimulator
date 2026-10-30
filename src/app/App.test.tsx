import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { useConfigStore, useRaceStore } from '@/application';

describe('App (integration)', () => {
  beforeEach(() => {
    useConfigStore.getState().selectBike('sym-drg-158');
  });

  it('renders gauges, parts and dyno with stock defaults', () => {
    render(<App />);
    // The bike's own dash by default (DRG: segment LCD), analysis dials one click away.
    expect(screen.getByTestId('dashboard')).toHaveAttribute('data-layout', 'lcd-bar');
    fireEvent.click(screen.getByTestId('gauge-view-dials'));
    expect(screen.getByTestId('tachometer')).toBeInTheDocument();
    expect(screen.getByTestId('speedometer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('gauge-view-stock'));
    expect(screen.getByTestId('part-ecu')).toHaveValue('stock');
    expect(screen.getByTestId('roller-set')).toHaveValue('18');
    expect(within(screen.getByTestId('dyno-summary')).getByText('原廠')).toBeInTheDocument();
  });

  it('switching bike loads its stock rollers', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('bike-select'), { target: { value: 'sym-jet-sl-125' } });
    expect(screen.getByTestId('roller-set')).toHaveValue('12');
    expect(screen.getByText('SYM JET SL 125 原廠規格・白牌速克達')).toBeInTheDocument();
  });

  it('changing a part enables its reset button and resetAll restores stock', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('part-ecu'), { target: { value: 'ecu-stage-1' } });
    expect(screen.getByTestId('part-ecu')).toHaveValue('ecu-stage-1');
    expect(screen.getByText('噴油/點火微調，中高轉扭力 +3~6%，斷油 +300 rpm')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全部重設' }));
    expect(screen.getByTestId('part-ecu')).toHaveValue('stock');
  });

  it('marks unverified specs as 估計值', () => {
    render(<App />);
    expect(screen.getAllByText('估計值').length).toBeGreaterThan(0);
  });

  it('saves a named preset', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('改裝組合名稱'), { target: { value: '測試組合' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存' }));
    expect(screen.getByText('測試組合')).toBeInTheDocument();
  });

  it('Space arms the timer', () => {
    render(<App />);
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });
    expect(screen.getByTestId('timer-phase')).toHaveAttribute('data-phase', 'armed');
  });
});

describe('App (manual bikes)', () => {
  beforeEach(() => {
    useConfigStore.getState().selectBike('sym-drg-158');
  });

  it('switching to 打檔車 shows the gear indicator and hides CVT parts', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('kind-manual'));
    expect(screen.getByTestId('gear-indicator')).toHaveTextContent('N');
    expect(screen.queryByTestId('roller-set')).not.toBeInTheDocument();
    expect(screen.queryByTestId('part-variator')).not.toBeInTheDocument();
    expect(screen.getByTestId('part-ecu')).toBeInTheDocument();
    expect(screen.getByText('齒盤比（大小齒）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '離合' })).toBeInTheDocument();
  });

  it('groups models by plate class', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('kind-manual'));
    const select = screen.getByTestId('bike-select');
    const groups = within(select)
      .getAllByRole('group')
      .map((g) => g.getAttribute('label'));
    expect(groups).toEqual(['白牌', '黃牌', '紅牌']);
  });

  it('→ shifts into 1st via the keyboard', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('kind-manual'));
    act(() => {
      fireEvent.keyDown(window, { code: 'ArrowRight' });
    });
    expect(screen.getByTestId('gear-indicator')).toHaveTextContent('1');
  });
});

describe('App (race mode)', () => {
  beforeEach(() => {
    useRaceStore.getState().setStep('mode');
    useRaceStore.getState().setTrack('central-speedway');
  });

  it('walks the garage: track → bike → tune → opponent → race', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('mode-race'));

    // 1. Track
    fireEvent.click(await screen.findByTestId('discipline-drag'));
    fireEvent.click(await screen.findByTestId('track-custom'));
    fireEvent.change(screen.getByTestId('race-distance'), { target: { value: '1000' } });
    expect(screen.getByText(/自訂賽道・1000 m/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-next'));

    // 2. Bike: cards show a stock ET estimate for the chosen track
    fireEvent.click(screen.getByTestId('bike-card-kawasaki-ninja-400'));
    expect(screen.getByTestId('bike-card-kawasaki-ninja-400')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByTestId('wizard-next'));

    // 3. Tune: a quick preset improves the estimate
    fireEvent.click(screen.getByTestId('tune-full'));
    // ET improves (negative delta) after the full tune.
    expect(within(screen.getByTestId('tune-estimate')).getByText(/\(-\d/)).toBeInTheDocument();
    expect(screen.getByTestId('tune-full')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('wizard-next'));

    // 4. Opponent
    fireEvent.click(screen.getByTestId('opponent-card-yamaha-mt-09'));
    fireEvent.click(screen.getByTestId('opponent-skill-pro'));
    expect(screen.getByTestId('matchup')).toHaveTextContent('對手快');
    fireEvent.click(screen.getByTestId('wizard-next'));

    // Race
    expect(await screen.findByTestId('race-canvas')).toBeInTheDocument();
    expect(await screen.findByText(/不支援 WebGL/)).toBeInTheDocument();
    expect(screen.getByTestId('race-hint')).toHaveTextContent('按 Space 開始倒數');
    act(() => {
      fireEvent.click(screen.getByTestId('race-go'));
    });
    expect(screen.getByTestId('race-hint')).toHaveTextContent('注意燈號');
    expect(screen.getByTestId('back-to-garage')).toBeDisabled();

    fireEvent.click(screen.getByTestId('mode-simulator'));
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
  });

  it('steps ahead of the current one are locked', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('mode-race'));
    expect(await screen.findByRole('button', { name: /對手/ })).toBeDisabled();
  });
});

describe('App (circuit racing)', () => {
  beforeEach(() => {
    useRaceStore.getState().setStep('mode');
    useRaceStore.getState().setDiscipline('drag');
  });

  it('picks a circuit, shows lap estimates, and enters a circuit race', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('mode-race'));
    fireEvent.click(await screen.findByTestId('discipline-circuit'));
    fireEvent.click(screen.getByTestId('circuit-hill-town'));
    fireEvent.click(screen.getByTestId('laps-1'));
    expect(screen.getByText(/山城技術賽道・1 圈/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-next'));

    expect(screen.getAllByText(/原廠預估單圈/).length).toBeGreaterThan(5);
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('matchup')).toHaveTextContent('預估單圈');
    fireEvent.click(screen.getByTestId('wizard-next'));

    expect(await screen.findByTestId('circuit-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('circuit-hint')).toHaveTextContent('按 Space 開始亮燈');
    expect(screen.getByTestId('race-lap')).toHaveTextContent('LAP 1/1');
    fireEvent.click(screen.getByTestId('camera-toggle'));
    expect(screen.getByTestId('camera-toggle')).toHaveTextContent('切到第三人稱');
  });
});
