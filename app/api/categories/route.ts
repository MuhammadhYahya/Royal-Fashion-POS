import { createCategory, listCategories } from "@/app/actions/category-actions";
import { apiErrorResponse } from "@/lib/pos/http";

export async function GET() {
  try {
    const categories = await listCategories();
    return Response.json({ data: categories });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await createCategory({
      name: String(body.name ?? ""),
    });
    return Response.json({ data: created });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
