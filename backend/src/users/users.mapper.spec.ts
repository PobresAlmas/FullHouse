import { toUserResponse } from './users.mapper.js';

describe('toUserResponse', () => {
  const user: any = { id: 'u1', codigo_pessoal: 'ABC123', nome: 'Ana', apelido: null, email: 'a@example.com', foto_url: null, status_moradia: 'PROCURANDO', senha_hash: 'secret', anonimizado_em: null, excluido_em: null };

  it('maps public user fields and omits null optionals', () => {
    expect(toUserResponse(user)).toEqual({ id: 'u1', code: 'ABC123', name: 'Ana', nickname: undefined, email: 'a@example.com', photo: undefined, housingStatus: 'PROCURANDO' });
    expect(toUserResponse(user)).not.toHaveProperty('senha_hash');
  });

  it('preserves nickname and photo when present', () => {
    expect(toUserResponse({ ...user, apelido: 'Nina', foto_url: 'https://cdn/photo.png' })).toMatchObject({ nickname: 'Nina', photo: 'https://cdn/photo.png' });
  });
});
