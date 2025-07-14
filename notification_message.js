const { EmbedBuilder } = require('discord.js');

function createNotificationEmbed() {
    return new EmbedBuilder()
        .setColor('Gold')
        .setTitle('Bitcoin 2100 is live on Botanix Mainnet!')
        .setDescription(
            '⚡ Step into **Bitcoin City**, a gamified world where every quest earns you real sats (not points), and every mission teaches you how to use the Bitcoin Economy.\n\n' +
            '⛏️📚💰 **Explore. Learn. Earn Bitcoin.** \n\n' +
            '🌐    __**https://2100abitcoinworld.com/**__\n\n' +
            'Invite only —\n use this Discord slash command to get access: **/2100**\n\n\n' +
            
            '_More info: https://botanixlabs.com/blog/bitcoin-2100-an-adventure-in-bitcoin-city_'
        )
        .setImage('https://media.discordapp.net/attachments/1317881540176248904/1394363618455195689/3aFOuS3R.png?ex=687689d0&is=68753850&hm=5c261fc9e6062af7f55c741a15b8d219f0252b21afac7e795126d66b9cac891a&=&format=webp&quality=lossless');
}

module.exports = { createNotificationEmbed };