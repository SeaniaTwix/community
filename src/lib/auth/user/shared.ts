import secureRandom from 'secure-random';

export const key =
  process.env.USE_SPECIFIC_KEY ?? secureRandom(256, {type: 'Buffer'});