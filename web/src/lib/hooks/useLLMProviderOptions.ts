import useSWR from "swr";
import { WellKnownLLMProviderDescriptor } from "@/interfaces/llm";
import { errorHandlingFetcher } from "@/lib/fetcher";

export function useLLMProviderOptions() {
  const { data, error, mutate } = useSWR<
    WellKnownLLMProviderDescriptor[] | undefined
  >("/api/admin/llm/built-in/options", errorHandlingFetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  });

  return {
    llmProviderOptions: data,
    isLoading: !error && !data,
    error,
    refetch: mutate,
  };
}
