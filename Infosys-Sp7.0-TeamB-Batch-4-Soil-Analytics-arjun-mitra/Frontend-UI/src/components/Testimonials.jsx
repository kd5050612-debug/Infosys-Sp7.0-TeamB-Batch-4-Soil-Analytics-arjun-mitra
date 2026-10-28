
import { Star, Quote, MapPin, Sprout } from 'lucide-react'
import './Testimonials.css'

const testimonials = [
  {
    name: 'Rajesh Patil',
    role: 'Farmer',
    location: 'Nashik, Maharashtra',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    text: 'Understanding soil nutrients and exploring suitable crop recommendations could make planning much easier.',
  },
  {
    name: 'Sunita Deshmukh',
    role: 'Farmer',
    location: 'Pune, Maharashtra',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    text: 'The idea of bringing soil insights and crop guidance together in one easy-to-use platform is exciting.',
  },
  {
    name: 'Amit Shinde',
    role: 'Agriculture enthusiast',
    location: 'Kolhapur, Maharashtra',
    rating: 4,
    image: 'https://randomuser.me/api/portraits/men/46.jpg',
    text: 'Clear soil information and practical recommendations can support more informed farming decisions.',
  },
  {
    name: 'Priya Jadhav',
    role: 'Agriculture student',
    location: 'Satara, Maharashtra',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
    text: 'Combining technology with agriculture can make soil analysis easier to understand and explore.',
  },
  {
    name: 'Vijay Pawar',
    role: 'Farmer',
    location: 'Sangli, Maharashtra',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/men/75.jpg',
    text: 'A simple platform for soil insights and crop information could be useful for farmers.',
  },
  {
    name: 'Meena Kulkarni',
    role: 'Agriculture researcher',
    location: 'Aurangabad, Maharashtra',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/women/65.jpg',
    text: 'Making agricultural information accessible is an important step toward technology-assisted farming.',
  },
  {
    name: 'Suresh More',
    role: 'Farmer',
    location: 'Ahmednagar, Maharashtra',
    rating: 4,
    image: 'https://randomuser.me/api/portraits/men/52.jpg',
    text: 'An easy-to-understand soil report could help people learn more about their land and its needs.',
  },
  {
    name: 'Anjali Pawar',
    role: 'Agri-business student',
    location: 'Latur, Maharashtra',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/women/26.jpg',
    text: 'I like the concept of combining soil assessment and crop advisory in one digital experience.',
  },
]

function TestimonialCard({ item }) {
  return (
    <article className="testimonial-card">
      <div className="testimonial-person">
        <img
          className="testimonial-avatar"
          src={item.image}
          alt={item.name}
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        <div className="testimonial-person-info">
          <h3>{item.name}</h3>
          <p>{item.role}</p>
        </div>

        <Quote className="testimonial-quote-icon" size={25} />
      </div>

      <div
        className="testimonial-stars"
        aria-label={`${item.rating} out of 5 stars`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            size={17}
            fill={index < item.rating ? 'currentColor' : 'none'}
          />
        ))}
      </div>

      <p className="testimonial-text">“{item.text}”</p>

      <div className="testimonial-location">
        <MapPin size={15} />
        <span>{item.location}</span>
      </div>

      <div className="testimonial-card-footer">
        <span>AGRICULTURE</span>
        <Sprout size={18} />
      </div>
    </article>
  )
}

function TestimonialRow({ items, direction }) {
  const repeatedItems = [...items, ...items]

  return (
    <div className="testimonial-marquee">
      <div
        className={`testimonial-track ${direction}`}
        aria-label="Agriculture testimonials"
      >
        {repeatedItems.map((item, index) => (
          <TestimonialCard
            key={`${item.name}-${index}`}
            item={item}
          />
        ))}
      </div>
    </div>
  )
}

export default function Testimonials() {
  const firstRow = testimonials.slice(0, 4)
  const secondRow = testimonials.slice(4, 8)

  return (
    <section className="testimonials-section" id="testimonials">
      <div className="testimonials-heading">
        <span className="testimonials-eyebrow">
          <Sprout size={16} />
          THE AGRISYNC COMMUNITY
        </span>

        <h2>
          Growing together,
          <br />
          <span>one field at a time.</span>
        </h2>

        <p>
          Explore perspectives on smarter soil analysis and
          technology-assisted agriculture.
        </p>
      </div>

      <div className="testimonial-rows">
        <TestimonialRow items={firstRow} direction="move-left" />
        <TestimonialRow items={secondRow} direction="move-right" />
      </div>

      <p className="testimonial-demo-note">
        Sample testimonials for UI demonstration · Replace with genuine,
        permissioned feedback before publishing.
      </p>
    </section>
  )
}
