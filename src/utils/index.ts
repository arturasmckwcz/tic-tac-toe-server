interface Logger {
  info: (...args: any[]) => void;
}

export function createLogger(prefix: string): Logger {
  return {
    info: function (...args: any) {
      console.log(prefix, ...args);
    },
  };
}
