import {
  useMutation as useTanstackMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

export type MutationParams<
  TData,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
  "mutationFn"
> & {
  func: (variables: TVariables) => Promise<TData>;
};

export function Mutation<
  TData,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
>({
  func,
  ...options
}: MutationParams<TData, TError, TVariables, TOnMutateResult>): UseMutationResult<
  TData,
  TError,
  TVariables,
  TOnMutateResult
> {
  return useTanstackMutation<TData, TError, TVariables, TOnMutateResult>({
    ...options,
    mutationFn: func,
  });
}

export const useMutation = Mutation;

export const useMutationFetch = Mutation;

export default Mutation;
