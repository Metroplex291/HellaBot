import { AutocompleteInteraction, ButtonInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../structures/Command';
import { Operator } from 'hella-types';
import { getOperator, getParadox } from '../utils/api';
import { operatorAutocomplete } from '../utils/autocomplete';
import { buildParadoxMessage } from '../utils/build';

export default class ParadoxCommand implements Command {
    data = new SlashCommandBuilder()
        .setName('paradox')
        .setDescription('Show an operator\'s Paradox Simulation stage')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Operator name')
                .setRequired(true)
                .setAutocomplete(true)
        );
    async autocomplete(interaction: AutocompleteInteraction) {
        const value = interaction.options.getFocused().toLowerCase();
        const callback = (op: Operator) => !!op.paradox;
        const arr = await operatorAutocomplete({ query: value, include: ['data.name', 'paradox.excel.charId'] }, callback);
        return await interaction.respond(arr);
    }
    async execute(interaction: ChatInputCommandInteraction) {
        const name = interaction.options.getString('name').toLowerCase();
        const op = await getOperator({ query: name });

        if (!op)
            return await interaction.reply({ content: 'That operator doesn\'t exist!', ephemeral: true });
        if (!op.paradox)
            return await interaction.reply({ content: 'That operator doesn\'t have a paradox simulation!', ephemeral: true });

        await interaction.deferReply();

        const paradoxEmbed = await buildParadoxMessage(op.paradox, 0);
        return await interaction.editReply(paradoxEmbed);
    }
    async buttonResponse(interaction: ButtonInteraction<CacheType>, idArr: string[]) {
        const op = await getOperator({ query: idArr[1] });
        const paradox = await getParadox({ query: op.id });
        const page = parseInt(idArr[2]);

        const paradoxEmbed = await buildParadoxMessage(paradox, page);
        await interaction.editReply(paradoxEmbed);
    }
}