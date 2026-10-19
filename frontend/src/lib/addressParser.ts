export type ParsedAddress = {
  name: string;
  phone: string;
  address: string;
};

const thaiPhoneRegex = /(0\d{8,9}|\+66\d{8,9})/;

// A token that starts one of these (or a digit) means the address has begun
const ADDRESS_START =
  /^(\d|บ้านเลขที่|เลขที่|หมู่|ม\.|ซอย|ซ\.|ถนน|ถ\.|แขวง|เขต|ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.|หมู่บ้าน|คอนโด|อาคาร|ตึก|ห้อง|ชั้น|หอพัก|โครงการ|แยก|ตรอก)/;

const HONORIFIC = /^(นาย|นาง|นางสาว|น\.ส\.|คุณ|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|ร\.ต\.|พ\.ต\.|ดร\.|Mr\.?|Mrs\.?|Ms\.?|Miss)$/i;

const LABELS = /(ชื่อ|ผู้รับ|ส่งที่|ส่งถึง|ที่อยู่|โทร|เบอร์|tel|phone)\s*[:：-]?/gi;

const MAX_NAME_TOKENS = 4;

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

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

export function smartAddressParser(input: string): ParsedAddress {
  const phoneMatch = input.replace(/[-\s]/g, "").match(thaiPhoneRegex) ?? input.match(thaiPhoneRegex);
  const phone = phoneMatch ? normalizeThaiPhone(phoneMatch[0]) : "";

  // Strip the phone number (including dashed/spaced forms) and field labels
  const withoutPhone = input
    .replace(/(?:\+66|0)\d(?:[ -]?\d){7,8}(?!\d)/g, " ")
    .replace(thaiPhoneRegex, " ")
    .replace(LABELS, " ");

  // A first line that holds no address marker is treated as the recipient name
  const lines = withoutPhone.split(/\r?\n/).map(clean).filter(Boolean);
  if (lines.length >= 2) {
    const firstTokens = lines[0].split(" ");
    if (!firstTokens.some((t) => ADDRESS_START.test(t)) && firstTokens.length <= MAX_NAME_TOKENS + 1) {
      return { name: lines[0], phone, address: clean(lines.slice(1).join(" ")) };
    }
  }

  const tokens = clean(lines.join(" ")).split(" ").filter(Boolean);
  let end = 0;
  while (end < tokens.length && end < MAX_NAME_TOKENS) {
    const token = tokens[end];
    // Honorifics are always part of the name, even if glued to the next token
    if (end > 0 && ADDRESS_START.test(token)) break;
    if (end === 0 && ADDRESS_START.test(token) && !HONORIFIC.test(token)) break;
    end++;
  }
  if (end === 0 && tokens.length > 0) end = 1;

  const name = tokens.slice(0, end).join(" ");
  const address = tokens.slice(end).join(" ") || name;

  return { name, phone, address };
}
