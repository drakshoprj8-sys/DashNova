import { describe, expect, it } from "vitest";

import {
  isCompanyComplete,
  missingCompanyFields,
  type CompanyProfile,
} from "@/lib/company";

const COMPLETE_COMPANY: CompanyProfile = {
  legalName: "Loja Exemplo, Unipessoal Lda.",
  tradeName: "Loja Exemplo",
  taxId: "123456789",
  address: "Rua Exemplo, 10",
  postalCode: "1000-001",
  city: "Lisboa",
  country: "Portugal",
  email: "apoio@exemplo.pt",
  phone: "",
};

describe("prontidão legal para comércio", () => {
  it("aceita um perfil com campos e formatos obrigatórios", () => {
    expect(isCompanyComplete(COMPLETE_COMPANY)).toBe(true);
  });

  it("recusa campos obrigatórios vazios", () => {
    expect(
      missingCompanyFields({ ...COMPLETE_COMPANY, legalName: "" }),
    ).toContainEqual({ field: "legalName", label: "Denominação social" });
  });

  it("recusa NIF, código postal e e-mail com formato inválido", () => {
    const gaps = missingCompanyFields({
      ...COMPLETE_COMPANY,
      taxId: "123",
      postalCode: "1000",
      email: "invalido",
    });

    expect(gaps.map((gap) => gap.field)).toEqual([
      "taxId",
      "postalCode",
      "email",
    ]);
  });
});
