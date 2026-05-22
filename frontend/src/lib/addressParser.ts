export type ParsedAddress = {
  name: string;
  phone: string;
  address: string;
};

const thaiPhoneRegex = /(0\d{8,9}|\+66\d{8,9})/;

export function normalizeThaiPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length >= 11) {
    return `0${digits.slice(2, 11)}`;
  }
  if (digits.startsWith("0")) {
    return digits.slice(0, 10);
  }
  return digits;
}

export function smartAddressParser(input: string): ParsedAddress {
  const text = input.replace(/\s+/g, " ").trim();
  const phoneMatch = text.match(thaiPhoneRegex);
  const phone = phoneMatch ? normalizeThaiPhone(phoneMatch[0]) : "";

  const cleaned = text
    .replace(thaiPhoneRegex, " ")
    .replace(/(ชื่อ|ผู้รับ|ส่งที่|โทร|เบอร์|tel|phone)\s*[:：-]?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter(Boolean);
  const nameTokens = tokens.slice(0, Math.min(4, tokens.length));
  const name = nameTokens.join(" ");
  const address = cleaned.replace(name, "").trim() || cleaned;

  return {
    name,
    phone,
    address,
  };
}
