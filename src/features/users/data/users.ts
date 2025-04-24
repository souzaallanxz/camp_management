import { faker } from '@faker-js/faker'

export const users = Array.from({ length: 20 }, () => {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  return {
    id: faker.string.uuid(),
    firstName,
    lastName,
    username: faker.internet
      .userName({ firstName, lastName })
      .toLocaleLowerCase(),
    email: faker.internet.email({ firstName }).toLocaleLowerCase(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    role: faker.helpers.arrayElement([
      'superadmin',
      'admin',
      'contributor',
      'cashier',
      'manager',
    ]),
    status: faker.helpers.arrayElement([
      'active',
      'inactive',
      'invited',
      'suspended',
    ]),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  }
})
