import { useEffect } from "react";
export default function usePageMeta(title, description) {
  useEffect(() => {
    document.title = `${title} | Med Purple`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        description ||
          "A little learning, every day. Your medical study space.",
      );
  }, [title, description]);
}
