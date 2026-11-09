import { describe, it, expect } from 'vitest'
import { splitName } from '../coaches'

describe('splitName', () => {
  it('splits a two-part name', () => {
    expect(splitName('Mike Daly')).toEqual({ first: 'Mike', last: 'Daly' })
  })

  it('splits a three-part name', () => {
    expect(splitName('John Paul Jones')).toEqual({
      first: 'John',
      last: 'Paul Jones',
    })
  })

  it('handles a single name', () => {
    expect(splitName('Coach')).toEqual({ first: 'Coach', last: '' })
  })

  it('handles empty string', () => {
    expect(splitName('')).toEqual({ first: '', last: '' })
  })

  it('trims whitespace', () => {
    expect(splitName('  Mike  Daly  ')).toEqual({ first: 'Mike', last: 'Daly' })
  })
})
