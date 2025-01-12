import { AutocompleteInteraction, ButtonInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../structures/Command';
import { getEnemy } from '../utils/api';
import { enemyAutocomplete } from '../utils/autocomplete';
import { buildEnemyMessage } from '../utils/build';

export default class EnemyCommand implements Command {
    data = new SlashCommandBuilder()
        .setName('enemy')
        .setDescription('Show an enemy\'s information and abilities')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Enemy name')
                .setRequired(true)
                .setAutocomplete(true)
        );
    async autocomplete(interaction: AutocompleteInteraction) {
        const value = interaction.options.getFocused().toLowerCase();
        const arr = await enemyAutocomplete({ query: value, include: ['excel'] });
        return await interaction.respond(arr);
    };
    async execute(interaction: ChatInputCommandInteraction) {
        const name = interaction.options.getString('name').toLowerCase();
        const enemy = await getEnemy({ query: name });

        if (!enemy)
            return await interaction.reply({ content: 'That enemy doesn\'t exist!', ephemeral: true });

        await interaction.deferReply();

        const enemyEmbed = await buildEnemyMessage(enemy, 0);
        return await interaction.editReply(enemyEmbed);
    }
    async buttonResponse(interaction: ButtonInteraction<CacheType>, idArr: string[]) {
        const enemy = await getEnemy({ query: idArr[1] });
        const level = parseInt(idArr[2]);

        const enemyEmbed = await buildEnemyMessage(enemy, level);
        await interaction.editReply(enemyEmbed);
    }
}