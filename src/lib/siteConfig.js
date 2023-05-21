export const SITE_URL = 'https://www.swyx.io';
export const GH_USER_REPO = 'swyxio/swyxdotio'; // used for pulling github issues and offering comments
export const SITE_TITLE = "swyx's site";
export const SITE_DESCRIPTION =
	'The official site of Shawn @swyx Wang, a technologist and recovering finance geek.';
export const DEFAULT_OG_IMAGE = SITE_URL + '/swyx-ski.jpeg';
export const MY_TWITTER_HANDLE = 'swyx';
export const MY_YOUTUBE = 'https://youtube.com/swyxTV?sub_confirmation=1';


export const APPROVED_POSTERS_GH_USERNAME = ['sw-yx', 'swyxio'];
export const POST_CATEGORIES = ['Essay', 'Note', 'Talk', 'Podcast', 'Tutorial', 'Snippet']; // Other categories you can consider adding: Talks, Tutorials, Snippets, Podcasts, Notes...
export const GH_PUBLISHED_TAGS = ['Published'];

// auto generated variables
export const REPO_URL = 'https://github.com/' + GH_USER_REPO;
export const REPO_OWNER = GH_USER_REPO.split('/')[0];

// dont forget process.env.GH_TOKEN
// if supplied, raises rate limit from 60 to 5000
// https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting
