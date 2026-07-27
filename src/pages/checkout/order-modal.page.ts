import { Locator, Page } from '@playwright/test';
import { BasePage } from '../base.page';

export interface OrderFormData {
  name: string;
  country: string;
  city: string;
  card: string;
  month: string;
  year: string;
}

export interface OrderConfirmation {
  id: string;
  amount: string;
  cardNumber: string;
  name: string;
  date: string;
}

export class OrderModalPage extends BasePage {
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly countryInput: Locator;
  readonly cityInput: Locator;
  readonly cardInput: Locator;
  readonly monthInput: Locator;
  readonly yearInput: Locator;
  readonly totalLabel: Locator;
  readonly purchaseButton: Locator;
  readonly confirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.modal = page.locator('#orderModal');
    this.nameInput = page.locator('#name');
    this.countryInput = page.locator('#country');
    this.cityInput = page.locator('#city');
    this.cardInput = page.locator('#card');
    this.monthInput = page.locator('#month');
    this.yearInput = page.locator('#year');
    this.totalLabel = page.locator('#totalm');
    this.purchaseButton = this.modal.getByRole('button', { name: 'Purchase' });
    this.confirmation = page.locator('.sweet-alert');
  }

  async fillOrderForm(data: OrderFormData): Promise<void> {
    await this.nameInput.fill(data.name);
    await this.countryInput.fill(data.country);
    await this.cityInput.fill(data.city);
    await this.cardInput.fill(data.card);
    await this.monthInput.fill(data.month);
    await this.yearInput.fill(data.year);
  }

  /**
   * Submitting with fields empty produces NEITHER a confirmation dialog NOR
   * a visible error message -- verified live (silent no-op). Callers testing
   * that path should assert `confirmation` never becomes visible, not look
   * for a validation error (there isn't one).
   */
  async purchase(): Promise<void> {
    await this.purchaseButton.click();
  }

  async getConfirmation(): Promise<OrderConfirmation> {
    await this.confirmation.waitFor({ state: 'visible' });
    const text = await this.confirmation.innerText();
    const idMatch = text.match(/Id:\s*(\S+)/);
    const amountMatch = text.match(/Amount:\s*([\d.]+\s*USD)/);
    const cardMatch = text.match(/Card Number:\s*(\S+)/);
    const nameMatch = text.match(/Name:\s*(.+)/);
    const dateMatch = text.match(/Date:\s*(.+)/);
    return {
      id: idMatch?.[1] ?? '',
      amount: amountMatch?.[1] ?? '',
      cardNumber: cardMatch?.[1] ?? '',
      name: nameMatch?.[1]?.split('\n')[0].trim() ?? '',
      date: dateMatch?.[1]?.split('\n')[0].trim() ?? '',
    };
  }

  async closeConfirmation(): Promise<void> {
    await this.confirmation.getByRole('button', { name: 'OK' }).click();
  }
}
