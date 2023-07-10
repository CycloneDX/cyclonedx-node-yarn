module.exports = {
  name: `CycloneDX-sbom`,
  factory: require => {
    const {BaseCommand} = require(`@yarnpkg/cli`);
    const {Command, Option} = require(`clipanion`);
    const t = require(`typanion`);

    class AdditionCommand extends BaseCommand {
      static paths = [[`CDX`]];

      // Show descriptive usage for a --help argument passed to this command
      static usage = Command.Usage({
        description: `hello world!`,
        details: `
          This command will print a nice message.
        `,
        examples: [[
          `Add two numbers together`,
          `yarn addition 42 10`,
        ]],
      });

      a = Option.String({validator: t.isNumber()});
      b = Option.String({validator: t.isNumber()});

      async execute() {
        this.context.stdout.write(`${this.a}+${this.b}=${this.a + this.b}\n`);
      }
    }

    return {
      commands: [
        AdditionCommand,
      ],
    };
  },
};
