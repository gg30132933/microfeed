import React from "react";
import EdgeHomeApp from '../edge-src/EdgeHomeApp';
import {WebResponseBuilder} from '../edge-src/common/PageUtils';
import {STATUSES} from "../common-src/Constants";

export async function onRequestGet({env, request}) {
  const {searchParams} = new URL(request.url);
  const tag = searchParams.get('tag');

  const webResponseBuilder = new WebResponseBuilder(env, request, {
    queryKwargs: {
      status: STATUSES.PUBLISHED,
    },
    // A tag filter is applied in JS below across *all* items, so pagination
    // must be disabled and every published item fetched (limit: -1 means
    // "no SQL LIMIT"). Fine at typical microfeed scale; would need a real
    // indexed query if item counts grow into the thousands.
    limit: tag ? -1 : undefined,
  });
  return webResponseBuilder.getResponse({
    getComponent: (content, jsonData, theme) => {
      if (tag) {
        jsonData.items = (jsonData.items || []).filter(
          (item) => Array.isArray(item.tags) && item.tags.includes(tag)
        );
        jsonData._microfeed.current_tag = tag;
        delete jsonData._microfeed.items_next_cursor;
        delete jsonData._microfeed.items_prev_cursor;
        delete jsonData._microfeed.next_url;
        delete jsonData._microfeed.prev_url;
      }
      return <EdgeHomeApp jsonData={jsonData} theme={theme}/>;
    },
  });
}
