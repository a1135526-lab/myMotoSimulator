import { describe, expect, it } from 'vitest';
import { ACCOUNT_DOMAIN, accountEmail, accountLabel, signInWithPassword } from './passwordAuth';

describe('game accounts', () => {
  it('turn an account name into its address, and keep real e-mails', () => {
    expect(accountEmail(' Rider_01 ')).toBe(`rider_01@${ACCOUNT_DOMAIN}`);
    expect(accountEmail('me@example.com')).toBe('me@example.com');
    expect(accountEmail('ab')).toBeNull();
    expect(accountEmail('有中文')).toBeNull();
    expect(accountEmail('bad@mail')).toBeNull();
  });

  it('show the account name, not the made-up address', () => {
    expect(accountLabel(`rider_01@${ACCOUNT_DOMAIN}`)).toBe('rider_01');
    expect(accountLabel('me@example.com')).toBe('me@example.com');
    expect(accountLabel(null)).toBeNull();
  });

  it('cannot sign in without the online service', async () => {
    expect(await signInWithPassword('rider_01', 'secret1')).toBe('這個版本沒有連線功能');
  });
});
