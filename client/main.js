import '../imports/api/books/methods';
import './layout';

Template.registerHelper('log', text => console.log(text));
Template.registerHelper('add', (v, nb) => v + nb);
Template.registerHelper('gte', (a, b) => a >= b);
Template.registerHelper('pluralize', (v, name) => {
  if (v <= 1) return `${v} ${name}`;
  else return `${v} ${name}s`;
});
