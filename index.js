const Config = require('./config.json');

const Discord = require('discord.js');
const Client = new Discord.Client();

const escapeStringRegexp = require('escape-string-regexp');

function randomBetween(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hierarchy: Guilds > Members > Text Channel
let newMembers = new Map();

Client.on('ready', () => {
	Client.guilds.forEach((guild, id) => newMembers.set(id, new Map()));
});

Client.on('guildCreate', guild => {
	newMembers.set(guild.id, new Map());
});

Client.on('guildDelete', guild => {
	newMembers.delete(guild.id);
});

Client.on('guildMemberAdd', member => {
	let guild = member.guild;

	let channel = guild.channels.find('name', 'general');
	newMembers.get(guild.id).set(member.id, channel.id);

	channel.send(`Hi <@${member.id}>, what's your name?`);
});

Client.on('guildMemberRemove', member => {
	let guild = member.guild;

	if (newMembers.get(guild.id).has(member.id)) {
		newMembers.get(guild.id).delete(member.id);
	}
});

Client.on('userUpdate', (oldUser, newUser) => {
	Client.guilds.forEach(async (guild, id) => {
		const member = await guild.fetchMember(newUser);
		if (!member) return;
		if (!member.nickname) return;
		if (!member.nickname.endsWith(' | ' + oldUser.username)) return;

		let name = member.nickname.replace(
				new RegExp(' | ' + escapeStringRegexp(oldUser.username) + '$', ''));
		member.setNickname(name + ' | ' + newUser.username);
	});
});

const approving = [
	'Of course!',
	'Sure.',
	'Ahh,',
	'Very well.',
	'Nice!'
];

const countering = [
	'Hmm...',
	'Well...',
	'Yeah, about that...',
	'Actually...'
];

function randomEntry(array) {
	return array[randomBetween(0, array.length - 1)];
}

function filterName(name) {
	return name.replace(/<:.+?:\d+?>/g, '')
			.replace(/\s{2,}/g, ' ');
}

async function setNickname(member, nickname, textChannel) {
	if (nickname.length > 32) return textChannel.send(`Sry, but \`${name}\` is too long :sleepy: Try something shorter`);

	await member.setNickname(nickname);
	newMembers.get(member.guild.id).delete(member.id);
}

Client.on('message', async (msg) => {
	if (msg.author === Client.user) return;
	// Filter only text messages, ignore welcome or pin messages
	if (!(msg.type === Discord.Constants.MessageTypes[0])) return;
	if (!(msg.channel instanceof Discord.TextChannel)) return;

	const parts = msg.content.split(' ');
	const cmd = parts[0];
	const args = parts.slice(1);

	const guild = msg.guild;
	const member = await guild.fetchMember(msg.author);

	try {
		let isNewUser = newMembers.get(guild.id).has(member.id);

		if (isNewUser) {
			if (newMembers.get(guild.id).get(member.id) !== msg.channel.id) return;

			let name = filterName(cmd + ' ' + args.join(' '));

			if (!name || name.match(/^\s+$/)) return;

			setNickname(member, name + ' | ' + msg.author.username, msg.channel);
			msg.channel.send(randomEntry(approving) + ` Welcome to the server, ${name} :smile:`);

		} else if (cmd === '--nick') {
			let name = filterName(args.join(' '));

			if (name) {
				setNickname(member, name + ' | ' + msg.author.username, msg.channel);
				msg.channel.send(randomEntry(countering) + ' still a shit name, tho :sweat_drops:');

			} else {
				await member.setNickname(msg.author.username);
				msg.channel.send("Dear Entity, I've successfully restored your nickname. :no_mouth: Regards");
			}
		}

	} catch (error) {
		msg.channel.send(`[Error] Couldn't process command \`${msg.content}\` | see console`);
		console.error(error);
	}
});

Client.on('error', console.error);

Client.login(Config.token);
