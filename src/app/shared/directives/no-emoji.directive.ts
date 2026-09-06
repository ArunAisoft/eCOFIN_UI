import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appNoEmoji]'
})
export class NoEmojiDirective {
  private emojiRegex = /[\p{Extended_Pictographic}]/gu;

  constructor(private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>) { }

  @HostListener('input', ['$event'])
  onInput(event: InputEvent) {
    const inputElement = this.el.nativeElement;
    const originalValue = inputElement.value;
    const cleanedValue = originalValue.replace(this.emojiRegex, '').trim();

    if (originalValue !== cleanedValue) {
      const start = inputElement.selectionStart || 0;
      const end = inputElement.selectionEnd || 0;

      inputElement.value = cleanedValue;
      inputElement.setSelectionRange(start - 1, end - 1);
      inputElement.dispatchEvent(new Event('input'));
    }
  }
}
