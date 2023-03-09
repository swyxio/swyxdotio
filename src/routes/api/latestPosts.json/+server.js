// import { json } from '@sveltejs/kit';
import { listContent } from '$lib/content';
import { listSpeaking } from '$lib/local-content';

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ fetch, setHeaders }) {
  let list = await listContent(fetch);
  const speaking = await listSpeaking();
  list = list.concat(speaking).sort((a, b) => b.date - a.date)
  setHeaders({
    'Cache-Control': `max-age=0, s-maxage=${3600}` // 1 hour
  });
  return new Response(JSON.stringify(list
    .slice(0, 10) // just get the latest 10
    .map((item) => {
      return {
        slug: item.slug,
        url: item.url,
        category: item.category,
        title: item.title,
        date: item.date,
        instances: item.instances,
      }
    })), {
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
}
