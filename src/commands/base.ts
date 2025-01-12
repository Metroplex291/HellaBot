import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../structures/Command';
import { Operator } from 'hella-types';
import { getOperator } from '../utils/api';
import { operatorAutocomplete } from '../utils/autocomplete';
import { buildBaseMessage } from '../utils/build';

export default class BaseCommand implements Command {
    data = new SlashCommandBuilder()
        .setName('base')
        .setDescription('Show an operator\'s base skills')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Operator name')
                .setRequired(true)
                .setAutocomplete(true)
        );
    async autocomplete(interaction: AutocompleteInteraction) {
        const value = interaction.options.getFocused().toLowerCase();
        const callback = (op: Operator) => op.bases.length !== 0;
        const arr = await operatorAutocomplete({ query: value, include: ['data.name', 'bases.buffId'] }, callback);
        return await interaction.respond(arr);
    }
    async execute(interaction: ChatInputCommandInteraction) {
        const name = interaction.options.getString('name').toLowerCase();
        const op = await getOperator({ query: name });

        if (!op)
            return await interaction.reply({ content: 'That operator doesn\'t exist!', ephemeral: true });
        if (op.bases.length === 0)
            return await interaction.reply({ content: 'That operator doesn\'t have any base skills!', ephemeral: true });

        await interaction.deferReply();

        let first = true;
        for (let i = 0; i < op.bases.length; i++) {
            const baseEmbed = await buildBaseMessage(op, i);
            if (first) {
                await interaction.editReply(baseEmbed);
                first = false;
            }
            else {
                await interaction.followUp(baseEmbed);
            }
        }
    }
}