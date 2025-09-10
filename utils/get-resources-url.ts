export const getImageUrl = (path: string): string => {
  if (path.length > 0 && path[1] === "/") {
    return process.env.NEXT_PUBLIC_BASE_PATH + '/images' + path;
  } else {
    return process.env.NEXT_PUBLIC_BASE_PATH + "/images/" + path;
  }
};
