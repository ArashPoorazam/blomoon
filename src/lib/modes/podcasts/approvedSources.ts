/** Owner-approved 2026-11-13. This manifest is inert: no automatic production seeding.
 * Permission/territory/attribution details: docs/media-expansion/podcast-sources.md.
 */
export const approvedPodcastSources = [
  {id:'1a3bdc6f-598a-4ba6-b341-bc6a9df67a01',name:'Hacker Public Radio',url:'https://hackerpublicradio.org/hpr_rss.php',
    origins:['https://hackerpublicradio.org'],attribution:'Hacker Public Radio and individual episode authors; retain episode-specific licence notices.',
    provenance:'Owner approved 2026-11-13; https://hackerpublicradio.org/about.html; CC BY-SA 4.0 by default, preserve per-episode terms.'},
  {id:'1a3bdc6f-598a-4ba6-b341-bc6a9df67a02',name:'LINUX Unplugged',url:'https://feeds.jupiterbroadcasting.com/lup',
    origins:['https://linuxunplugged.com','https://feeds.jupiterbroadcasting.com'],attribution:'LINUX Unplugged — Jupiter Broadcasting — CC BY-SA 4.0.',
    provenance:'Owner approved 2026-11-13; https://www.jupiterbroadcasting.com/show/linux-unplugged/; CC BY-SA 4.0.'},
] as const;
