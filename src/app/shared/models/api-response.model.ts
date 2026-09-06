export type ApiData = string | number | any[] | Record<string, any> | null;

export interface ApiResponse<T = ApiData> {
  success: boolean;
  status: number;
  message: string;
  data: T;
}
