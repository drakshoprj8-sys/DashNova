import { CustomerAccessError } from "@/features/customers/access";
import { getCustomerStats } from "@/features/customers/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getCustomerStats());
  } catch (error) {
    if (error instanceof CustomerAccessError)
      return Response.json({ error: error.message }, { status: error.status });
    return Response.json(
      { error: "Não foi possível carregar os indicadores." },
      { status: 500 },
    );
  }
}
