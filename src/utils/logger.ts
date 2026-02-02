export const logger = {
  info: (message: string, data?: unknown) => {
    console.log({
      level: "info",
      message,
      data,
      time: new Date().toISOString(),
    });
  },

  warn: (message: string, data?: unknown) => {
    console.warn({
      level: "warn",
      message,
      data,
      time: new Date().toISOString(),
    });
  },

  error: (message: string, data?: unknown) => {
    console.error({
      level: "error",
      message,
      data,
      time: new Date().toISOString(),
    });
  },
};
