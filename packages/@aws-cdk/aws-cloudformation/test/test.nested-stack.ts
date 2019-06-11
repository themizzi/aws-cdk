import { App, CfnResource, Construct, Stack } from '@aws-cdk/cdk';
import fs = require('fs');
import { Test } from 'nodeunit';
import path = require('path');
import { NestedStack } from '../lib/nested-stack';

export = {
  'fails if defined as a root'(test: Test) {
    // THEN
    test.throws(() => new NestedStack(undefined as any, 'boom'), /must be defined within scope of another non-nested stack/);
    test.done();
  },

  'fails if defined without a parent stack'(test: Test) {
    // GIVEN
    const app = new App();
    const group = new Construct(app, 'group');

    // THEN
    test.throws(() => new NestedStack(app, 'boom'), /must be defined within scope of another non-nested stack/);
    test.throws(() => new NestedStack(group, 'bam'), /must be defined within scope of another non-nested stack/);
    test.done();
  },

  'fails if defined as a child of another nested stack'(test: Test) {
    // GIVEN
    const parent = new Stack();

    // WHEN
    const nested = new NestedStack(parent, 'nested');

    // THEN
    test.throws(() => new NestedStack(nested, 'child-of-nested'), /must be defined within scope of another non-nested stack/);
    test.done();
  },

  'can be defined as a direct child or an indirect child of a Stack'(test: Test) {
    // GIVEN
    const parent = new Stack();

    // THEN
    new NestedStack(parent, 'direct');
    new NestedStack(new Construct(parent, 'group'), 'indirect');
    test.done();
  },

  'nested stack is not synthesized as a stack artifact into the assembly'(test: Test) {
    // GIVEN
    const app = new App();
    const parentStack = new Stack(app, 'parent-stack');
    new NestedStack(parentStack, 'nested-stack');

    // WHEN
    const assembly = app.synth();

    // THEN
    test.deepEqual(assembly.artifacts.length, 1);
    test.done();
  },

  'the template of the nested stack is synthesized into the cloud assembly'(test: Test) {
    // GIVEN
    const app = new App();
    const parent = new Stack(app, 'parent-stack');
    const nested = new NestedStack(parent, 'nested-stack');
    new CfnResource(nested, 'ResourceInNestedStack', { type: 'AWS::Resource::Nested' });

    // WHEN
    const assembly = app.synth();

    // THEN
    const template = JSON.parse(fs.readFileSync(path.join(assembly.directory, `${nested.node.uniqueId}.nested.template.json`), 'utf-8'));
    test.deepEqual(template, {
      Resources: {
        ResourceInNestedStack: {
          Type: 'AWS::Resource::Nested'
        }
      }
    });
    test.done();
  },

  'file asset metadata is associated with the parent stack'(test: Test) {
    // GIVEN
    const app = new App();
    const parent = new Stack(app, 'parent-stack');
    const nested = new NestedStack(parent, 'nested-stack');
    new CfnResource(nested, 'ResourceInNestedStack', { type: 'AWS::Resource::Nested' });

    // WHEN
    const assembly = app.synth();

    // THEN
    test.deepEqual(assembly.getStack(parent.name).assets, [ 1 ]);
    test.done();
  },

  'aws::cloudformation::stack is synthesized in the parent scope'(test: Test) {
    // GIVEN
    const app = new App();
    const parent = new Stack(app, 'parent-stack');
    const nested = new NestedStack(parent, 'nested-stack');
    new CfnResource(nested, 'ResourceInNestedStack', { type: 'AWS::Resource::Nested' });

    // WHEN
    const assembly = app.synth();

    // THEN
    test.deepEqual(assembly.getStack(parent.name).template, {
      Resources: {
        nestedstackResource: {
          Type: 'AWS::CloudFormation::Stack',
          Properties: { TemplateURL: 'http://sss' }
        }
      }
    });
    test.done();
  },
};