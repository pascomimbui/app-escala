import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const channelUrl = 'https://www.youtube.com/@AparecidaImbui/streams';
    const res = await fetch(channelUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      next: { revalidate: 300 } // cache for 5 minutes
    });

    if (!res.ok) {
      throw new Error(`YouTube fetching failed with status: ${res.status}`);
    }

    const html = await res.text();
    const dataRegex = /var ytInitialData = (.*?);<\/script>/;
    const match = html.match(dataRegex);

    if (!match) {
      throw new Error('ytInitialData not found in HTML');
    }

    const data = JSON.parse(match[1]);
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs;
    
    if (!tabs) {
      return NextResponse.json({ events: [] });
    }

    const streamsTab = tabs.find((t: any) => 
      t.tabRenderer?.title === 'Ao vivo' || 
      t.tabRenderer?.title === 'Live' || 
      t.tabRenderer?.title?.toLowerCase().includes('vivo')
    );

    if (!streamsTab) {
      return NextResponse.json({ events: [] });
    }

    const contents = streamsTab.tabRenderer?.content?.richGridRenderer?.contents || [];
    const scheduledEvents: any[] = [];

    contents.forEach((item: any) => {
      const video = item.richItemRenderer?.content?.videoRenderer;
      if (video) {
        const title = video.title?.runs?.[0]?.text;
        const videoId = video.videoId;
        const upcomingEventData = video.upcomingEventData;
        
        let thumbnail = '';
        if (video.thumbnail?.thumbnails?.length > 0) {
          const thumbs = video.thumbnail.thumbnails;
          thumbnail = thumbs[thumbs.length - 1].url; // get highest resolution
        }

        if (upcomingEventData && upcomingEventData.startTime) {
          scheduledEvents.push({
            title,
            videoId,
            startTime: Number(upcomingEventData.startTime),
            thumbnail
          });
        }
      }
    });

    // Sort by startTime ascending (closest first)
    scheduledEvents.sort((a, b) => a.startTime - b.startTime);

    return NextResponse.json({ events: scheduledEvents });
  } catch (error) {
    console.error('YouTube Scrape API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
