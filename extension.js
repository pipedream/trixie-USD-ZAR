'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let panelButton;
let panelButtonText;
let session;
let dollarQuotation;
let previousDollarQuotation = null;
let sourceId = null;

// Handle Requests API Dollar
async function handle_request_dollar_api() {
    try {
        // Create a new Soup Session if it doesn't exist
        if (!session) {
            session = new Soup.Session({ timeout: 10 });
        }

        // Create body of Soup request
        let message = Soup.Message.new('GET', 'https://www.cbr-xml-daily.ru/daily_json.js');

        // Send Soup request to API Server
        let bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        let response = new TextDecoder().decode(bytes.get_data());
        const body_response = JSON.parse(response);

        // Check if the response contains the expected data
        if (!body_response || !body_response['Valute'] || !body_response['Valute']['USD'] || !body_response['Valute']['USD']['Value']) {
            throw new Error('Invalid API response');
        }

        // Get the value of Dollar Quotation
        dollarQuotation = body_response['Valute']['USD']['Value'].toFixed(2).replace('.', ',');

        // Determine color based on previous quotation
        let color = 'white'; // Default color
        if (previousDollarQuotation !== null) {
            if (parseFloat(dollarQuotation.replace(',', '.')) > parseFloat(previousDollarQuotation.replace(',', '.'))) {
                color = 'green'; // Доллар стал дороже (рубль упал)
            } else {
                color = 'red'; // Доллар стал дешевле (рубль укрепился)
            }
        }
        previousDollarQuotation = dollarQuotation;

        // Set text in Widget
        panelButtonText = new St.Label({
            style_class: 'cPanelText',
            text: `USD = <span color='white'>${dollarQuotation}</span> <span color='${color}'>RUB</span>`,
            y_align: Clutter.ActorAlign.CENTER,
            use_markup: true,
        });
        panelButton.set_child(panelButtonText);

    } catch (error) {
        console.error(`Error in [handle_request_dollar_api]: ${error.message}`);
        panelButtonText = new St.Label({
            text: 'USD = ? RUB',
            y_align: Clutter.ActorAlign.CENTER,
        });
        panelButton.set_child(panelButtonText);
    } finally {
        if (session) {
            session.abort();
        }
    }
}

export default class Extension {
    enable() {
        console.log('Enabling USD-RUB extension...'); // Логирование для отладки

        panelButton = new St.Bin({
            style_class: 'panel-button',
        });

        // Initial API call
        handle_request_dollar_api();

        // Add the button to the panel
        Main.panel._centerBox.insert_child_at_index(panelButton, 0);

        // Set up a periodic update every 24 hours (86400 seconds)
        sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 86400, () => {
            handle_request_dollar_api();
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        console.log('Disabling USD-RUB extension...'); // Логирование для отладки

        // Remove the button from the panel
        Main.panel._centerBox.remove_child(panelButton);

        // Clean up resources
        if (panelButton) {
            panelButton.destroy();
            panelButton = null;
        }

        if (sourceId) {
            GLib.Source.remove(sourceId);
            sourceId = null;
        }

        if (session) {
            session.abort();
            session = null;
        }
    }
}
