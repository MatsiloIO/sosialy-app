import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'spaceNumber',
    standalone: true
})
export class SpaceNumberPipe implements PipeTransform {

    transform(value: number | string | null | undefined): string {
        if (value === null || value === undefined) return '0';

        // Convertir en nombre
        let num = typeof value === 'string' ? parseFloat(value) : value;

        if (isNaN(num)) return '0';

        // Arrondir à l'entier (0 décimale)
        num = Math.round(num);

        // Formater avec espace comme séparateur de milliers
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}