import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams();
  
  if (resolvedParams) {
    Object.entries(resolvedParams).forEach(([key, value]) => {
      if (typeof value === "string") {
        params.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => {
          if (typeof v === "string") {
            params.append(key, v);
          }
        });
      }
    });
  }

  const queryString = params.toString();
  redirect(`/auth${queryString ? `?${queryString}` : ""}`);
}

