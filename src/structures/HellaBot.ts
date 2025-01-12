import { ActivityType, Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { getRogueTheme } from '../utils/api';
import * as Build from '../utils/build';
import { Command } from './Command';

export default class HellaBot {
    client: Client;
    commands = new Collection<string, Command>();

    public constructor(token: string, clientId: string, channelId: string, intents: { intents: GatewayIntentBits[] }) {
        this.client = new Client(intents);
        this.client.login(token);
        this.loadCommands(token, clientId);
        this.handleInteractions(channelId);

        this.client.once(Events.ClientReady, client => {
            console.log(`Ready! Logged in as ${client.user.tag}`);
            client.user.setActivity('CC#13', { type: ActivityType.Competing });
        });
    }

    async loadCommands(token: string, clientId: string) {
        const commandArr = [];
        const commandFiles = readdirSync(join(__dirname, '..', 'commands')).filter(file => file.endsWith('.ts'));
        for (const file of commandFiles) {
            const command = new (await import(join(__dirname, '..', 'commands', file))).default();
            this.commands.set(command.data.name, command);
            commandArr.push(command.data.toJSON());
        }
        const rest = new REST().setToken(token);
        await rest.put(Routes.applicationCommands(clientId), { body: commandArr },);
    }

    async handleInteractions(channelId: string) {
        if (channelId && channelId !== '') {
            this.client.on(Events.GuildCreate, async guild => {
                const channel = await this.client.channels.fetch(channelId);
                const name = guild.name;
                const memberCount = guild.memberCount;
                const owner = (await this.client.users.fetch(guild.ownerId)).username;
                if (channel.isTextBased()) {
                    channel.send(`Joined server \`${name}\`, owned by \`${owner}\`, with \`${memberCount}\` members.`);
                }
            });
            this.client.on(Events.GuildDelete, async guild => {
                const channel = await this.client.channels.fetch(channelId);
                const name = guild.name;
                const memberCount = guild.memberCount;
                const owner = (await this.client.users.fetch(guild.ownerId)).username;
                if (channel.isTextBased()) {
                    channel.send(`Left server \`${name}\`, owned by \`${owner}\`, with \`${memberCount}\` members.`);
                }
            });
        }

        this.client.on(Events.InteractionCreate, async interaction => {
            if (interaction.isChatInputCommand()) {

                const command = this.commands.get(interaction.commandName);
                if (!command) return console.error(`No command matching ${interaction.commandName} was found.`);
                try {
                    await command.execute(interaction);
                } catch (err) {
                    console.error(err);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                    else {
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                }
            }
            else if (interaction.isAutocomplete()) {
                try {
                    const command = this.commands.get(interaction.commandName);
                    await command.autocomplete(interaction);
                } catch (err) {
                    console.error(err);
                }
            }
            else if (interaction.isButton()) {
                try {
                    const idArr: string[] = interaction.customId.split('ඞ');

                    if (idArr[0] === 'rogue') {
                        await interaction.deferUpdate();

                        switch (idArr[1]) {
                            case 'relic': {
                                const theme = parseInt(idArr[2]);
                                const index = parseInt(idArr[3]);

                                const relicListEmbed = await Build.buildRogueRelicListMessage(theme, index);
                                await interaction.editReply(relicListEmbed);

                                break;
                            }
                            case 'stage': {
                                const theme = parseInt(idArr[2]);
                                const rogueTheme = await getRogueTheme({ query: theme.toString() })
                                const stages = idArr[4] === 'true' ? rogueTheme.toughStageDict : rogueTheme.stageDict;
                                const stage = stages[idArr[3]];
                                const page = parseInt(idArr[5]);

                                const stageEmbed = await Build.buildRogueStageMessage(theme, stage, page);
                                await interaction.editReply(stageEmbed);

                                break;
                            }
                        }
                    }
                    else {
                        const command = this.commands.get(interaction.customId.split('ඞ')[0]);
                        await interaction.deferUpdate();
                        await command.buttonResponse(interaction, idArr);
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            else if (interaction.isStringSelectMenu()) {
                try {
                    const idArr: string[] = interaction.customId.split('ඞ');
                    const command = this.commands.get(interaction.customId.split('ඞ')[0]);
                    await interaction.deferUpdate();
                    await command.selectResponse(interaction, idArr);
                } catch (err) {
                    console.error(err);
                }
            }
        });
    }
}