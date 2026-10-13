/**
 * Dados legais da empresa, usados nas páginas obrigatórias (Termos,
 * Privacidade, Cookies, Devoluções).
 *
 * ⚠️ PREENCHA ANTES DE ANUNCIAR. Em Portugal, a lei do comércio eletrónico
 * (DL 7/2004) obriga a identificar o vendedor: denominação, NIF, morada e
 * contactos. Campos vazios aparecem marcados como pendentes nas páginas
 * públicas e no painel, em vez de dados inventados.
 */
export interface CompanyProfile {
  legalName: string;
  tradeName: string;
  taxId: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
}

export const company: CompanyProfile = {
  /** Denominação social (ex.: "Victor Silva, Unipessoal Lda.") */
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME?.trim() ?? "",
  /** Nome comercial exibido ao cliente */
  tradeName: process.env.NEXT_PUBLIC_COMPANY_TRADE_NAME?.trim() || "Minha Loja",
  /** NIF / NIPC português (9 dígitos) */
  taxId: process.env.NEXT_PUBLIC_COMPANY_TAX_ID?.trim() ?? "",
  /** Morada da sede */
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() ?? "",
  postalCode: process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE?.trim() ?? "",
  city: process.env.NEXT_PUBLIC_COMPANY_CITY?.trim() ?? "",
  country: process.env.NEXT_PUBLIC_COMPANY_COUNTRY?.trim() || "Portugal",
  /** Contactos de apoio ao cliente */
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL?.trim() ?? "",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE?.trim() ?? "",
};

export interface CompanyGap {
  field: string;
  label: string;
}

/** Campos legais ainda por preencher ou com formato inválido. */
export function missingCompanyFields(
  profile: CompanyProfile = company,
): CompanyGap[] {
  const required: CompanyGap[] = [
    { field: "legalName", label: "Denominação social" },
    { field: "taxId", label: "NIF / NIPC" },
    { field: "address", label: "Morada da sede" },
    { field: "postalCode", label: "Código postal" },
    { field: "city", label: "Localidade" },
    { field: "email", label: "E-mail de apoio" },
  ];
  const gaps = required.filter(
    (r) => !profile[r.field as keyof CompanyProfile]?.toString().trim(),
  );

  if (profile.taxId.trim() && !/^\d{9}$/.test(profile.taxId.trim())) {
    gaps.push({ field: "taxId", label: "NIF / NIPC válido (9 dígitos)" });
  }
  if (
    profile.postalCode.trim() &&
    !/^\d{4}-\d{3}$/.test(profile.postalCode.trim())
  ) {
    gaps.push({
      field: "postalCode",
      label: "Código postal válido (0000-000)",
    });
  }
  if (
    profile.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
  ) {
    gaps.push({ field: "email", label: "E-mail de apoio válido" });
  }

  return gaps;
}

export function isCompanyComplete(profile: CompanyProfile = company): boolean {
  return missingCompanyFields(profile).length === 0;
}

export const COMMERCE_NOT_READY_MESSAGE =
  "A loja ainda não pode aceitar pagamentos porque os dados legais do vendedor estão incompletos. Nenhum valor foi cobrado.";

/** Linha de identificação do vendedor, para rodapés e páginas legais. */
export function companyIdentification(): string {
  if (!isCompanyComplete()) return "";
  return `${company.legalName}, NIF ${company.taxId}, ${company.address}, ${company.postalCode} ${company.city}, ${company.country}`;
}
