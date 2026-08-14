declare module "bcrypt" {
  const bcrypt: {
    hash(value: string, saltRounds: number): Promise<string>;
    compare(value: string, hash: string): Promise<boolean>;
  };
  export default bcrypt;
}

declare module "memoizee" {
  export default function memoize<T extends (...args: any[]) => any>(
    fn: T,
    options?: { maxAge?: number },
  ): T;
}

declare module "*.sql" {
  const sql: string;
  export default sql;
}
