const { Button } = require('@eartharoid/dbf');
const ExtendedEmbedBuilder = require('../lib/embed');
const { isStaff } = require('../lib/users');
const { MessageFlags } = require('discord.js');

module.exports = class CloseButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'close',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	async run(id, interaction) {
		/** @type {import("client")} */
		const client = this.client;

		if (id.accepted === undefined) {
			// the close button on the opening message, the same as using /close
			await client.tickets.beforeRequestClose(interaction);
		} else {
			const ticket = await client.tickets.getTicket(interaction.channel.id, true);
			const getMessage = client.i18n.getLocale(ticket.guild.locale);
			const staff = await isStaff(interaction.guild, interaction.user.id);
			const isCreator = interaction.user.id === ticket.createdById;

			// staff e criador do ticket sempre podem fechar
			if (!staff && !isCreator) {
				return await interaction.reply({
					embeds: [
						new ExtendedEmbedBuilder()
							.setColor(ticket.guild.errorColour)
							.setDescription(getMessage('ticket.close.wait_for_staff')),
					],
					flags: MessageFlags.Ephemeral,
				});
			}

			if (id.accepted) {
				if (
					isCreator &&
					ticket.category.enableFeedback &&
					!ticket.feedback
				) {
					return await interaction.showModal(client.tickets.buildFeedbackModal(ticket.guild.locale, { next: 'acceptClose' }));
				} else {
					await interaction.deferReply();
					await client.tickets.acceptClose(interaction);
				}
			} else {
				try {
					await interaction.update({
						components: [],
						embeds: [
							new ExtendedEmbedBuilder({
								iconURL: interaction.guild.iconURL(),
								text: ticket.guild.footer,
							})
								.setColor(ticket.guild.errorColour)
								.setDescription(getMessage('ticket.close.rejected', { user: interaction.user.toString() }))
								.setFooter({ text: null }),
						],
					});
				} finally {
					client.tickets.$stale.delete(ticket.id);
				}
			}
		}
	}
};
