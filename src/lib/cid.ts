export function isValidThaiCid(cid: string) {
  if (!/^\d{13}$/.test(cid)) {
    return false;
  }

  const checksum = cid
    .slice(0, 12)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (13 - index), 0);

  const checkDigit = (11 - (checksum % 11)) % 10;
  return checkDigit === Number(cid[12]);
}
