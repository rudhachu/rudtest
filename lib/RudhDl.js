const config = require("../config");
const { getBuffer, getJson } = require("./utils");

const RudDL = {
	facebook: async url => {
		const res = await getJson(
			apiUrl + `api/facebook?url=${encodeURIComponent(url)}`,
		);
		return res.url;
	},
	instagram: async url => {
		const res = await fetch(apiUrl + `api/instagram?url=${url}`);
		const json = await res.json();
		const bufferRes = await fetch(json.url);
		const data = await bufferRes.arrayBuffer();
		const dataBuffer = Buffer.from(data);
		return dataBuffer;
	},
	twitter: async url => {
		const res = await getJson(apiUrl + `api/twitter?url=${url}`);
		return await getBuffer(res.url);
	},
	youtube: async (url, type = {}) => {
		if (type.mp4) {
			const res = apiUrl + `api/ytmp4?url=${url}`;
			const data = await getJson(res);
			return {
				title: data.title,
				thumb: data.thumbnail,
				url: data.url,
			};
		} else if (type.mp3) {
			const res = await getJson(apiUrl + `api/ytmp3?url=${url}`);
			return {
				title: res.title,
				thumb: res.thumbnail,
				url: res.link,
			};
		}
	},
	tiktok: async url => {
		const res = apiUrl + `api/tiktok?url=${url}`;
		const data = await getJson(res);
		return {
			title: data.title,
			url: data.url,
		};
	},
	chatbot: async text => {
		if (!text) return `_How can I help you today?_`;
		const res = await getJson(apiUrl + `api/hericai?query=${text}`);
		return res.answer;
	},
	facts: async () => {
		const res = apiUrl + `api/facts`;
		const data = await getJson(res);
		return data.fact;
	},
	quotes: async () => {
		const res = apiUrl + `api/quotes`;
		const data = (await getJson(res)).quote;
		return `Quote: ${data.quote}\n\nAuthor: ${data.author}`;
	},
	advice: async () => {
		const res = apiUrl + `api/advice`;
		const data = await getJson(res);
		return data.advice;
	},
	rizz: async () => {
		const res = apiUrl + `api/rizz`;
		const data = await getJson(res);
		return data.text;
	},
	bible: async verse => {
		const res = apiUrl + `api/bible?verse=${verse}`;
		const data = await getJson(res);
		return data.text;
	},
	fancy: async text => {
		const res = await getJson(apiUrl + `api/fancy?text=${text}`);
		return res.result;
	},
	short: async url => {
		const res = await getJson(apiUrl + `api/tinyurl?url=${url}`);
		return res.result;
	},
	generatePdf: async content => {
		if (!content) return '_No content provided_';
		return await getBuffer(
			apiUrl + `api/textToPdf?content=${encodeURIComponent(content)}`,
		);
	},
	maths: async expression => {
		const res = await getJson(
			apiUrl + `api/solveMath?expression=${expression}`,
		);
		return res.result;
	},
	searchSticker: async query => {
		const res = await getJson(apiUrl + `api/ssticker?query=${query}`);
		return res.sticker;
	},
	obfuscate: async code => {
		if (!code) return 'Provide a code to obfuscate';
		const res = await getJson(apiUrl + `api/obfuscate?code=${code}`);
		return res.result;
	},
	ttp: async text => {
		const res = await getJson(apiUrl + `api/ttp?text=${text}`);
		return await getBuffer(res[0].url);
	},
	gitstalk: async username => {
		const res = await getJson(
			apiUrl + `api/gitstalk?username=${username}`,
		);
		return res;
	},
	makeSticker: async (
		url,
		pack = config.STICKER_PACK.split(';')[0],
		author = config.STICKER_PACK.split(';')[1],
	) => {
		return fetch(
			apiUrl + `api/sticker?url=${encodeURIComponent(
				url,
			)}&packname=${pack}&author=${author}`,
		)
			.then(response => {
				if (!response.ok) {
					throw new Error(
						`Failed to fetch sticker: ${response.statusText}`,
					);
				}
				return response.arrayBuffer();
			})
			.then(buffer => Buffer.from(buffer))
			.catch(error => {
				console.error('Error creating sticker:', error.message);
				throw error;
			});
	},
	flipMedia: async (url, direction) => {
		const res = await getBuffer(
			apiUrl + `api/flip?url=${url}&direction=${direction}`,
		);
		return res;
	},
	blackvideo: async url => {
		const res = await getBuffer(apiUrl + `api/blackvideo?url=${url}`);
		return res;
	},
	photo: async url => {
		const res = await getBuffer(apiUrl + `api/photo?url=${url}`);
		return res;
	},
	mp3: async url => {
		const res = await getBuffer(apiUrl + `api/mp3?url=${url}`);
		return res;
	},
	google: async query => {
		const res = await getJson(apiUrl + `api/google?query=${query}`);
		return res.result;
	},
	translate: async (text, lang) => {
		const res = await getJson(
			apiUrl + `api/translate?text=${text}&to=${lang}`,
		);
		return res.result;
	},
	wallpaper: async query => {
		const res = await getJson(apiUrl + `api/wallpaper?query=${query}`);
		return res;
	},
	wikipedia: async query => {
		const res = await getJson(apiUrl + `api/wikipedia?query=${query}`);
		return res;
	},
	mediafire: async url => {
		const res = await getJson(apiUrl + `api/mediafire?url=${url}`);
		return res;
	},
	bing: async query => {
		const res = await getJson(apiUrl + `api/bing?query=${query}`);
		return res.result;
	},
	technews: async () => {
		return await getJson(apiUrl + `api/technews`);
	},
	news: async () => {
		return await getJson(apiUrl + `api/news`);
	},
	forex: async type => {
		const res = await getJson(apiUrl + `api/${type}`);
		return res;
	},
	yahoo: async query => {
		const res = await getJson(apiUrl + `api/yahoo?query=${query}`);
		return res.result;
	},
	animenews: async () => {
		return await getJson(apiUrl + `api/animenews`);
	},
	footballnews: async () => {
		return await getJson(apiUrl + `api/footballnews`);
	},
	meme: async (text, type) => {
		const res = await getBuffer(
			apiUrl + `api/meme/${type}?text=${encodeURIComponent(text)}`,
		);
		return res;
	},
	airquality: async (country, city) => {
		const res = await getJson(
			apiUrl + `api/airquality?country=${encodeURIComponent(
				country,
			)}&city=${encodeURIComponent(city)}`,
		);
		return res;
	},
};

module.exports = RudDL;
