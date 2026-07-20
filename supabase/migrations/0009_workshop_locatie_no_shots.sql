-- Shots horen niet meer bij de workshop op locatie. De sitetekst noemt ze
-- niet langer, dus de pakketomschrijving mag ze ook niet meer beloven:
-- die tekst rolt via service_packages door naar de offertes.

begin;

update service_packages
set description = 'Leer onder begeleiding van onze bartender twee cocktails maken, inclusief materialen. Wij komen naar jouw locatie toe.'
where package_name = 'Workshop op Locatie';

commit;
