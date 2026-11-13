import type { TerraMode } from '../types';
export const podcastMode: TerraMode = {
  id:'podcasts',label:'Podcasts',controlIcon:'podcast',
  copy:{countryLoadingLabel:'Loading shows',emptyLabel:'No matching podcasts. Try another language, topic or search.',fallbackNotice:'Podcast catalog unavailable.',itemPlural:'shows',itemSingular:'show',listSubtitle:'Search titles, language:fa or topic:technology',loadingLabel:'Loading podcasts',loadingMoreLabel:'Loading more shows',randomPlaybackError:'Podcast playback is not available yet.',searchPlaceholder:'Search shows · language:fa · topic:technology',searchingLabel:'Searching podcasts'},
  dataEndpoint:'/api/modes/podcasts/points',defaultSortId:'title',sortOptions:[{id:'title',label:'Title (normalized)'}],
  listEndpoint:({query,countryCode,limit,offset,pageToken})=>{
    const params=new URLSearchParams({limit:String(limit),offset:String(offset)});
    const text=query.replace(/(?:^|\s)(language|topic):("[^"]*"|\S+)/g,(_,key:string,value:string)=>{params.set(key,value.replace(/^"|"$/g,''));return ' ';});
    params.set('q',text.trim());if(countryCode)params.set('countryCode',countryCode);if(pageToken)params.set('pageToken',pageToken);
    return `/api/modes/podcasts/search?${params}`;
  },
  detailEndpoint:id=>`/api/modes/podcasts/points/${encodeURIComponent(id)}`,
  markerMetricLabel:'Shows',markerColorMode:'single',
  formatPointMetric:()=> 'Podcast',formatDetailSections:detail=>detail ? [{title:'Show',fields:detail.fields}] : [],
};
