export function createLogger(prefix: string) {
  return {
    info: function (...args: any) {
      console.log(prefix, ...args);
    },
  };
}
