---
title: "REST method override filter"
category: programming
tags: [java, rest]
date: 2010-04-21
---
The current trend of developing web applications based on REST service can find an obstacle in the proxy and firewall 
configurations: most of these drop requests other than the `GET` and `POST`. The best practices of REST API design involve 
using all HTTP methods to describe the actions, rather than changing the URI, i.e., The URI should identify the resources, not the actions.

A URI like `http://example.com/users/delete/6` is an example of how somebody should represent REST API resources. It should be
`http://example.com/users/6` and handle the DELETE method to remove the user with id `6`.

A clever solution to keep the API clean is to override the original method with one specified in a request header. So that a 
`POST` method can act as the `PUT` or `DELETE` methods. The `X-HTTP-Method-Override` is the commonly used
header for this purpose.

## The java source code:

```java

	public class MethodOverrideFilter implements Filter {
	
		public static final String HEADER_PARAM = "methodOverrideHeader";
		
		public static final String DEFAULT_HEADER = "X-HTTP-Method-Override";
		
		private String header = DEFAULT_HEADER;
		
		public void init(FilterConfig filterConfig) throws ServletException {
		
		    header = filterConfig.getInitParameter(HEADER_PARAM);
		    if(StringUtils.isBlank(header)) {
		      header = DEFAULT_HEADER;
		    }
		
		}
		
		public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
		
			ServletRequest filteredRequest = request;
			
			if(request instanceof HttpServletRequest) {
			
			  HttpServletRequest httpRequest = (HttpServletRequest)request;
			  filteredRequest = new MethodOverrideHttpServletRequestDecorator(
				httpRequest, 
				header
			  );
			}
			
			chain.doFilter(filteredRequest, response);
		}
	
		public void destroy() {
			// Empty
		}
	
		private class MethodOverrideHttpServletRequestDecorator extends HttpServletRequestWrapper {
		
			public static final String DEFAULT_HEADER = "X-HTTP-Method-Override";
			
			private final String methodOverrideHeader;
			
			private transient String method;
			
			public MethodOverrideHttpServletRequestDecorator(HttpServletRequest request, String methodOverrideHeader) {
				super(request);
				this.methodOverrideHeader = methodOverrideHeader;
			}
			
			@Override
			public String getMethod() {
			
				if(method==null) {
					method = resolveMethod();
				}
				
				return method;
			}
			
			protected String resolveMethod() {
			
				String headerValue = getHeader(methodOverrideHeader);
				
				if(headerValue!=null) {
					return headerValue;
				}
				else {
					return super.getMethod();
				}
			}
		
		}
	}

```

You can find the source code at [https://gist.github.com/923414].
