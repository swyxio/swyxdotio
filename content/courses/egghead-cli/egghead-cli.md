# Build Custom CLI Tooling with OClif and React-Ink

## Workshop description

Across companies like Facebook, Salesforce, Atlassian and Stripe, developer productivity is an increasing area of investment, leading to the rise of dedicated infrastructure teams for JavaScript and other languages. Even at smaller scales, given the amount of repetitive tasks we do, it would be worth it to occasionally invest in custom tooling - if only it were easier to get started. Meanwhile, over the past 2 years, great new frameworks in CLI tooling have arisen in JavaScript that would be extremely accessible to a wide audience.

Today, you can't do anything in JavaScript without bumping into a CLI. Want to install a library? `yarn add` it. Want a React app? `create-react-app`.  Want to format your JavaScript? `prettier --write`. Want your types checked? `tsc`. Bundling? Pick from `webpack`, `rollup`, or `parcel`. Deploying? `now` or `netlify deploy`. CLI's are everywhere, and even if you don't write them, sooner or later you'll have to debug them.

Yet, nobody's teaching how this all works.

This workshop serves as a comprehensive survey of the state of the art of CLI tooling for the ambitious developer looking to make an impact in open source, across their company, and even in their own productivity. 

Topics Include:

- Create a Simple CLI
- Pass Args and flags to a CLI
- Set up testing for a CLI
- Add filesystem state to a CLI
- Scaffold boilerplates (e.g. templates)
- Polish the CLI with colors, spinners, etc.
- Spawn child processes so other CLIs can run
- Control logging & output from other processes

As Dan Abramov recently said: "Here's a thing that I learned at FB that I wish I knew much earlier. Invest in building custom tools! It can be a script you could write in a day. And at small and medium companies, even a little effort can yield a huge return."

This workshop is the "missing manual" for writing Node CLI's. We hope you'll benefit from it as much as we have creating it.



## CFP

> Why is this topic important for somebody to learn?

_What problems does it solve for the learner? What's the real world context where knowledge gained from the course could be applied? (This helps us figure out promotional angles, as well as next steps for the learner to follow.)_

Across companies like Facebook, Salesforce, Atlassian and Stripe, developer productivity is an increasing area of investment, leading to the rise of dedicated infrastructure teams for JavaScript and other languages. Even at smaller scales, given the amount of repetitive tasks we do, it would be worth it to occasionally invest in custom tooling - if only it were easier to get started. Meanwhile, over the past 2 years, great new frameworks in CLI tooling have arisen in JavaScript that would be extremely accessible to a wide audience.

This workshop serves as a comprehensive survey of the state of the art of CLI tooling for the ambitious developer looking to make an impact in open source, across their company, and even in their own productivity. As Dan Abramov recently said: "Here's a thing that I learned at FB that I wish I knew much earlier. Invest in building custom tools! It can be a script you could write in a day. And at small and medium companies, even a little effort can yield a huge return."

> What should the learner be able to do at the end of this workshop?

_The big picture goal. The "super power" they will be granted when this knowledge is absorbed. "After completing this course, the desired end result is for learners to…"_

After completing this course, the desired end result is for learners to set up wonderfully interactive and maintainable CLI's for their libraries and workflows that can improve the productivity of fellow developers across open source and internal company audiences.

> What are the milestones that a student will reach as they work toward the big picture goal of this workshop?

_This isn't a final list of lessons, but it is a general outline of the concepts and vocabulary your workshop will engrain in the learner's mind._

- Create a Hello World Single-Command CLI with Oclif
- Understand when to use Multi-Command vs Single-Command in Oclif
- Parse Arguments and Flags in an Oclif Command
- Set up Testing for Oclif CLI's
- Read User Config with Cosmiconfig
- Build Your Own Boilerplate Scaffolding CLI with Copy-Template-Dir and EJS
- Execute and Pipe Child Processes with Execa
- Beautiful Prompts for User Input with Enquirer
- Store State on Filesystem in CLI's respecting XDG-spec with Conf
- Create CLI's that Intelligently Adapt to Usage with Frecency
- Prompt Users to Update CLI Versions with Update Notifier
- Polish CLI Output with Ora, CLI-UX, and Chalk
- Build Interactive CLI Components with React Ink
- Create Flexible CLI Layouts with React Ink's Box Component
- Create Accessible Full Fledged User Interfaces with React Ink Input Components

This workshop is basically the Avengers of everything I've learned building CLI's over the past year.

> What could the example or demo be for this workshop?

_People learn best by doing. What will they build? What are some ideas for examples? What are some real-life "production" examples that might inspire the workshop example? This is a brainstorm. Nothing is too big or too small._

A nice demo would be to "Create Your Own Create-React-App", with all the modern UX and DX niceties that are available today, but it gets people acquainted with all the tooling they need to build their own CLI tools by their imagination.
