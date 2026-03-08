import { PosError } from "./errors";

export function apiErrorResponse(error: unknown) {
  if (error instanceof PosError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: 400 },
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message,
      },
    },
    { status: 500 },
  );
}

