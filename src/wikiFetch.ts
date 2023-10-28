import TurndownService from 'turndown';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function stripCss(html) {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')  // Remove style tags
    .replace(/ class="[^"]*"/gm, '')            // Remove class attributes
    .replace(/ style="[^"]*"/gm, '');           // Remove inline styles
}

export async function fetchWikipediaData(query: string) {
  if (query.length < 2) {
    console.log('Query too short');
    return;
  }

  try {
    await sleep(1000);

    console.log(`Fetching wikipedia data for ${query}...\n`)

    const searchResults = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${query}&srlimit=5`).then(response => response.json());

    if (!searchResults.query) throw new Error('Invalid API response');

    const pageIds = searchResults.query.search.map(result => result.pageid);
    // console.log(pageIds);

    const pageDataPromises = pageIds.slice(0, 3).map(pageId =>
      Promise.all([
        fetch(`https://en.wikipedia.org/w/api.php?action=parse&prop=text|categories|links|images|externallinks&redirects=true&format=json&pageid=${pageId}`).then(response => response.json()),
        fetch(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=file:${query}&format=json`).then(response => response.json())
      ])
    );

    const pageData = await Promise.all(pageDataPromises);

    return pageData.map(([enPageData, commonsSearchResults]) => {
      if (!enPageData.parse || !commonsSearchResults.query) throw new Error('Invalid API response');

      const { title, externallinks, categories, text, links } = enPageData.parse

      const categoryNames = categories.map(category => category['*']);

      const linkNames = links.map(link => link['*']);

      const html = text['*'];
      const strippedHtml = stripCss(html);

      const turndownService = new TurndownService()
      const contentHTML = turndownService.turndown(strippedHtml)

      const content = stripCss(contentHTML)

      const mediaFiles = commonsSearchResults.query.search.map((result: any) => result.title);

      // console.log({
      //   title,
      //   content,
      //   mediaFiles,
      //   categoryNames,
      //   linkNames,
      //   externallinks,
      // });

      return {
        title,
        content,
        mediaFiles,
        categoryNames,
        linkNames,
        externallinks,
      };
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}