const MEMBER_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const RESERVED_MEMBER_NAMES = new Set([
  "admin", "administrator", "astrocrown", "genesis", "moderator",
  "nova", "official", "support", "system",
]);

export function normalizeMemberName(value) {
  if (typeof value !== "string" || /[\u0000-\u001F\u007F]/.test(value)) return null;
  const memberName = value.normalize("NFKC").trim();
  if (!MEMBER_NAME_PATTERN.test(memberName)) return null;
  const normalized = memberName.toLowerCase();
  if (RESERVED_MEMBER_NAMES.has(normalized)) return null;
  return { memberName, normalized };
}

export function createDefaultMemberName(accountIdentifier) {
  if (typeof accountIdentifier !== "string" || !/^AC-[A-F0-9]{10}$/.test(accountIdentifier)) {
    throw new TypeError("A valid AstroCrown account identifier is required to create the default member name.");
  }
  return "Crown_" + accountIdentifier.slice(3);
}

export const MEMBER_NAME_RULES = Object.freeze({
  minLength: 3,
  maxLength: 20,
  pattern: "Start with a letter; use only English letters, numbers and underscores.",
  uniqueness: "Case-insensitive across all AstroCrown accounts.",
});
