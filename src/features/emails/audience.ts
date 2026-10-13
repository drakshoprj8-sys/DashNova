import type { Recipient } from "./segments";

export function paginateEmailAudience(
  recipients: Recipient[],
  options: { q: string; from: string; to: string; page: number },
) {
  const q = options.q.trim().toLocaleLowerCase("pt");
  const matches = recipients
    .filter((recipient) => {
      const created = recipient.createdAt?.slice(0, 10) ?? "";
      if (options.from && (!created || created < options.from)) return false;
      if (options.to && (!created || created > options.to)) return false;
      return (
        !q ||
        [recipient.name, recipient.email, recipient.productName ?? ""].some(
          (value) => value.toLocaleLowerCase("pt").includes(q),
        )
      );
    })
    .sort(
      (a, b) => a.name.localeCompare(b.name, "pt") || a.id.localeCompare(b.id),
    );
  const pageSize = 100;
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(options.page) || 1));
  return {
    recipients: matches.slice((page - 1) * pageSize, page * pageSize),
    total: matches.length,
    page,
    pageCount,
    matchingIds: matches.map((recipient) => recipient.id),
    audienceIds: recipients.map((recipient) => recipient.id),
  };
}
