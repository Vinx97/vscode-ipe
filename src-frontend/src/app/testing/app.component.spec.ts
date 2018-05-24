import { AppComponent } from '../app.component'
import { ExtensionService } from '../classes/extension.service';
import { RegexService } from '../classes/regex.service';
import { Card, CardOutput } from 'vscode-ipe-types';

describe('AppComponent', () => {
    let appComponent: AppComponent;

    const sampleCard = new Card(0, 'sample Hello World card', 'print("Hello, World!")', [new CardOutput('stdout', 'Hello, world!')]);
    const noOutputCard = new Card(0, 'sample card', 'print("Hello, World!")', []);
    const stdoutCard = new Card(0, 'stdout card', 'print("Hello, world!")', [new CardOutput('stdout', 'Hello, world!')]);
    const textPlainCard = new Card(0, 'text/plain card', 'print("Hello, world!")', [new CardOutput('text/plain', 'Hello, world!')]);
    const errorCard = new Card(0, 'error card', 'print("Hello, world!")', [new CardOutput('error', 'code errors')]);
    const richCard = new Card(0, 'sample graph', 'some code', [
        new CardOutput('text/html', "<script>requirejs.config({paths: { 'plotly': ['https://cdn.plot.ly/plotly-latest.min']},});if(!window.Plotly) {{require(['plotly'],function(plotly) {window.Plotly=plotly;});}}</script>"),
        new CardOutput('text/html', '<div id="66f3f87d-6ec3-46a5-81b7-0d78b189a25f" style="height: 525px; width: 100%;" class="plotly-graph-div"></div><script type="text/javascript">require(["plotly"], function(Plotly) { window.PLOTLYENV=window.PLOTLYENV || {};window.PLOTLYENV.BASE_URL="https://plot.ly";Plotly.newPlot("66f3f87d-6ec3-46a5-81b7-0d78b189a25f", [{"x": [1, 2, 3], "y": [3, 1, 6]}], {}, {"showLink": true, "linkText": "Export to plot.ly"})});</script>')
    ]);

    beforeEach(() => { appComponent = new AppComponent(new ExtensionService, new RegexService); });
   
    it('AppComponent is correctly initialised', () => {
        expect(appComponent.selectedCards).toEqual(new Set<Card>(), 'selectedCards');
        expect(appComponent.visibleCards).toEqual(new Map<Card, boolean>(), 'visibleCards');
        expect(appComponent.searchQuery).toEqual('', 'searchQuery');
        expect(appComponent.typeFilters).toEqual({text: true, rich: true, error: true}, 'typeFilters');
    });

    it('updateFilters() correctly change searchQuery and typeFilters', () => {
        appComponent.updateFilters( {search: 'return 0', filters: {text: false, rich: false, error: false}} );
        expect(appComponent.searchQuery).toEqual('return 0', 'searchQuery is different after first change');
        expect(appComponent.typeFilters).toEqual({text: false, rich: false, error: false}, 'typeFilters = {false, false, false} after first change');
        
        appComponent.updateFilters( {search: 'print("Hello, World!")', filters: {text: false, rich: true, error: false}} );
        expect(appComponent.searchQuery).toEqual('print("Hello, World!")', 'searchQuery is different after first change');
        expect(appComponent.typeFilters).toEqual({text: false, rich: true, error: false}, 'typeFilters = {true, false, true} after second change');
    });

    it('updateFilters() correctly change visibleCards: Map<Card, boolean>', () => {
        appComponent.cards = [textPlainCard, richCard, errorCard];
        expect(appComponent.cards).toEqual([textPlainCard, richCard, errorCard], 'original Card[] at first');
        
        appComponent.updateFilters({search: '', filters: {text: true, rich: true, error: true}});
        expect(appComponent.visibleCards).toEqual(new Map( [[textPlainCard, true], [richCard, true], [errorCard, true]] ));
        appComponent.updateFilters({search: 'return', filters: {text: true, rich: true, error: true}});
        expect(appComponent.visibleCards).toEqual(new Map( [[textPlainCard, false], [richCard, false], [errorCard, false]] ));
        appComponent.updateFilters({search: '', filters: {text: true, rich: true, error: false}});
        expect(appComponent.visibleCards).toEqual(new Map( [[textPlainCard, true], [richCard, true], [errorCard, false]] ));
    });

    it('cardMatchesSearchQuery() returns correct boolean', () => {
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(true, 'searchQuery empty, return true');
        
        appComponent.searchQuery = 'card';
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(true, 'only card.title contains normal searchQuery, return true');
        appComponent.searchQuery = 'print("Hello, World!")';
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(true, 'only card.sourceCode contains normal searchQuery, return true');
        appComponent.searchQuery = 'h';
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(true, 'both card.title and card.sourceCode contain normal searchQuery, return true');

        appComponent.searchQuery = '/c/gi';
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(true, 'only card.title contains regex searchQuery, return true');
        appComponent.searchQuery = '/!/gi';
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(true, 'only card.sourceCode contains regex searchQuery, return true');
        appComponent.searchQuery = '/([A-Z])\\w+/gi';
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(true, 'both card.title and card.sourceCode contain regex searchQuery, return true');
        
        appComponent.searchQuery = 'Earth';
        expect(appComponent.cardMatchesSearchQuery(sampleCard)).toEqual(false, 'neither card.title nor card.sourceCode contains normal/regex searchQuery, return true');
    });

    it('cardMatchesFilter() returns correct boolean', () => {
        // All visible, initially
        expect(appComponent.cardMatchesFilter(noOutputCard)).toEqual(true, 'treat empty cards as plain');
        expect(appComponent.cardMatchesFilter(stdoutCard)).toEqual(true, 'stdout plain text');
        expect(appComponent.cardMatchesFilter(textPlainCard)).toEqual(true, 'text/plain');
        expect(appComponent.cardMatchesFilter(errorCard)).toEqual(true, 'code errors');
        expect(appComponent.cardMatchesFilter(richCard)).toEqual(true, 'rich output');

        // None visible
        appComponent.typeFilters = {text: false, rich: false, error: false};
        expect(appComponent.cardMatchesFilter(noOutputCard)).toEqual(false, 'treat empty cards as plain');
        expect(appComponent.cardMatchesFilter(stdoutCard)).toEqual(false, 'stdout plain text');
        expect(appComponent.cardMatchesFilter(textPlainCard)).toEqual(false, 'text/plain');
        expect(appComponent.cardMatchesFilter(errorCard)).toEqual(false, 'code errors');
        expect(appComponent.cardMatchesFilter(richCard)).toEqual(false, 'rich output');

        // Partially visible
        appComponent.typeFilters = {text: false, rich: true, error: true};
        expect(appComponent.cardMatchesFilter(noOutputCard)).toEqual(false, 'treat empty cards as plain');
        expect(appComponent.cardMatchesFilter(stdoutCard)).toEqual(false, 'stdout plain text');
        expect(appComponent.cardMatchesFilter(textPlainCard)).toEqual(false, 'text/plain');
        expect(appComponent.cardMatchesFilter(errorCard)).toEqual(true, 'code errors');
        expect(appComponent.cardMatchesFilter(richCard)).toEqual(true, 'rich output');
    });

    it('cardSelected() correctly manages selectedCards array', () => {
        appComponent.cards = [textPlainCard, richCard, errorCard];
        expect(appComponent.cards).toEqual([textPlainCard, richCard, errorCard], 'original Card[] at first');
        expect(appComponent.selectedCards.size).toEqual(0, 'selectedCards has 0 element at first');

        appComponent.cardSelected(richCard, true);
        expect(appComponent.selectedCards.has(richCard)).toEqual(true);
        expect(appComponent.selectedCards.size).toEqual(1, 'selectedCards has 1 element');

        appComponent.cardSelected(textPlainCard, false);
        expect(appComponent.selectedCards.has(textPlainCard)).toEqual(false, 'false, does not add card');
        expect(appComponent.selectedCards.has(richCard)).toEqual(true, 'current state preserved');
        expect(appComponent.selectedCards.size).toEqual(1, 'selectedCards has 1 element');

        appComponent.cardSelected(richCard, false);
        expect(appComponent.selectedCards.has(richCard)).toEqual(false, 'richCard is removed');
        expect(appComponent.selectedCards.size).toEqual(0, 'selectedCards has 0 element again');
    });

    it('cardMoved() triggers correct move function', () => {
        appComponent.cards = [textPlainCard, richCard, errorCard];
        expect(appComponent.cards).toEqual([textPlainCard, richCard, errorCard], 'original Card[] at first');

        appComponent.cardMoved(richCard, 'up');
        expect(appComponent.cards).toEqual([richCard, textPlainCard, errorCard], 'corectly moved richCard up');
        appComponent.cardMoved(textPlainCard, 'down');
        expect(appComponent.cards).toEqual([richCard, errorCard, textPlainCard], 'corectly moved textPlainCard down');
    });

    it('moveUp() correctly moves a card up', () => {
        appComponent.cards = [textPlainCard, richCard, errorCard];
        expect(appComponent.cards).toEqual([textPlainCard, richCard, errorCard], 'original Card[] at first');

        appComponent.moveUp(errorCard);
        expect(appComponent.cards).toEqual([textPlainCard, errorCard, richCard], 'move last card up once');
        appComponent.moveUp(errorCard);
        expect(appComponent.cards).toEqual([errorCard, textPlainCard, richCard], 'move last card up twice');
        appComponent.moveUp(errorCard);
        expect(appComponent.cards).toEqual([errorCard, textPlainCard, richCard], 'move first card up, expect no change');
    });

    it('moveDown() correctly moves a card down', () => {
        appComponent.cards = [textPlainCard, richCard, errorCard];
        expect(appComponent.cards).toEqual([textPlainCard, richCard, errorCard], 'original Card[] at first');

        appComponent.moveDown(textPlainCard);
        expect(appComponent.cards).toEqual([richCard, textPlainCard, errorCard], 'move first card down once');
        appComponent.moveDown(textPlainCard);
        expect(appComponent.cards).toEqual([richCard, errorCard, textPlainCard], 'move first card down twice');
        appComponent.moveDown(textPlainCard);
        expect(appComponent.cards).toEqual([richCard, errorCard, textPlainCard], 'move last card down, expect no change');
    });

    it('addCard() correctly adds a card', () => {
        appComponent.cards = [];
        expect(appComponent.cards).toEqual([], 'no cards at first');

        appComponent.addCard(sampleCard);
        expect(appComponent.cards).toEqual([sampleCard], 'sampleCard added');
        appComponent.addCard(textPlainCard);
        expect(appComponent.cards).toEqual([sampleCard, textPlainCard], 'textPlainCard added at the end');
        appComponent.addCard(richCard);
        expect(appComponent.cards).toEqual([sampleCard, textPlainCard, richCard], 'richCard added at the end');
    });

    it('deleteCard() correctly deletes a card', () => {
        appComponent.cards = [textPlainCard, richCard, errorCard];
        expect(appComponent.cards).toEqual([textPlainCard, richCard, errorCard], 'original Card[] at first');

        appComponent.deleteCard(errorCard);
        expect(appComponent.cards).toEqual([textPlainCard, richCard], 'errorCard deleted');
        appComponent.deleteCard(textPlainCard);
        expect(appComponent.cards).toEqual([richCard], 'textPlainCard deleted');
        appComponent.deleteCard(richCard);
        expect(appComponent.cards).toEqual([], 'all cards deleted');
    });

  });
