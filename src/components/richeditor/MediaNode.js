"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { videoEmbedUrl } from "./uploadMedia";

function VideoView({ node }) {
  const { src } = node.attrs;
  const embedUrl = videoEmbedUrl(src);
  return (
    <NodeViewWrapper className="hm-media-node my-2">
      <div className="aspect-video w-full max-w-md overflow-hidden rounded-lg bg-black" contentEditable={false}>
        {embedUrl ? (
          <iframe src={embedUrl} title="Embedded video" className="h-full w-full" allowFullScreen />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={src} controls className="h-full w-full" />
        )}
      </div>
    </NodeViewWrapper>
  );
}

function AudioView({ node }) {
  return (
    <NodeViewWrapper className="hm-media-node my-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio src={node.attrs.src} controls contentEditable={false} className="w-full max-w-sm" />
    </NodeViewWrapper>
  );
}

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-video-embed") || "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video-embed]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(HTMLAttributes, { "data-video-embed": node.attrs.src });
    const embedUrl = videoEmbedUrl(node.attrs.src);
    const wrapper = document.createElement("div");
    Object.entries(attrs).forEach(([key, value]) => wrapper.setAttribute(key, value));
    wrapper.className = "hm-media-node";
    if (embedUrl) {
      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.setAttribute("allowfullscreen", "true");
      iframe.title = "Embedded video";
      wrapper.appendChild(iframe);
    } else {
      const video = document.createElement("video");
      video.src = node.attrs.src;
      video.controls = true;
      wrapper.appendChild(video);
    }
    return wrapper;
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});

export const AudioEmbed = Node.create({
  name: "audioEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return { src: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "audio[data-audio-embed]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["audio", mergeAttributes(HTMLAttributes, { "data-audio-embed": "true", src: node.attrs.src, controls: "true" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioView);
  },
});
